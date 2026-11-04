#!/usr/bin/env python3
"""Generate narration for every line in src/script.json.

Writes narration/<id>.mp3 plus narration/manifest.json (durations). The animation
re-times itself to the manifest automatically, so re-run render.cjs afterwards.

Providers (pick with --provider, default: whichever key is present):

  elevenlabs   needs ELEVENLABS_API_KEY            (network: api.elevenlabs.io)
  polly        needs POLLY_AWS_ACCESS_KEY_ID and    (network: polly.<region>.amazonaws.com)
               POLLY_AWS_SECRET_ACCESS_KEY

Polly deliberately does NOT fall back to the default AWS_* variables or ~/.aws,
so a work account that happens to be configured on the machine is never billed.

  python3 tools/tts.py                       # all lines
  python3 tools/tts.py --only L5,L5b         # just these
  python3 tools/tts.py --provider polly --voice Matthew
  python3 tools/tts.py --provider elevenlabs --voice <voice_id>
"""
import argparse, json, os, subprocess, sys, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NARR = os.path.join(ROOT, 'narration')


def duration(path):
    out = subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path])
    return float(out.strip())


def trim(path):
    """Strip leading/trailing silence so lines butt up against the animation cues."""
    tmp = path + '.tmp.mp3'
    flt = ('silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,'
           'areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.12,areverse')
    subprocess.check_call(['ffmpeg', '-v', 'error', '-y', '-i', path, '-af', flt, '-c:a', 'libmp3lame', '-q:a', '2', tmp])
    os.replace(tmp, path)


def elevenlabs(text, voice, prev_text, next_text, out):
    key = os.environ['ELEVENLABS_API_KEY']
    body = {
        'text': text,
        'model_id': os.environ.get('ELEVENLABS_MODEL', 'eleven_multilingual_v2'),
        'voice_settings': {'stability': 0.45, 'similarity_boost': 0.8, 'style': 0.25, 'use_speaker_boost': True},
    }
    if prev_text: body['previous_text'] = prev_text
    if next_text: body['next_text'] = next_text
    req = urllib.request.Request(
        f'https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=mp3_44100_192',
        data=json.dumps(body).encode(), headers={'xi-api-key': key, 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=120) as r, open(out, 'wb') as f:
            f.write(r.read())
    except urllib.error.HTTPError as e:
        sys.exit(f'elevenlabs error {e.code}: {e.read().decode()[:400]}')


def polly(text, voice, out, region):
    import boto3  # pip install boto3
    session = boto3.session.Session(
        aws_access_key_id=os.environ['POLLY_AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['POLLY_AWS_SECRET_ACCESS_KEY'],
        region_name=region)
    client = session.client('polly')
    for engine in ('generative', 'long-form', 'neural'):
        try:
            r = client.synthesize_speech(Text=text, VoiceId=voice, Engine=engine, OutputFormat='mp3', SampleRate='24000')
            with open(out, 'wb') as f:
                f.write(r['AudioStream'].read())
            return engine
        except client.exceptions.ClientError as e:
            last = e
    sys.exit(f'polly failed for voice {voice}: {last}')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--provider', choices=['elevenlabs', 'polly'])
    ap.add_argument('--voice', help='ElevenLabs voice_id or Polly VoiceId')
    ap.add_argument('--region', default='us-east-1')
    ap.add_argument('--only', help='comma-separated line ids')
    a = ap.parse_args()

    provider = a.provider or ('elevenlabs' if os.environ.get('ELEVENLABS_API_KEY')
                              else 'polly' if os.environ.get('POLLY_AWS_ACCESS_KEY_ID') else None)
    if not provider:
        sys.exit('No TTS key found. Set ELEVENLABS_API_KEY, or POLLY_AWS_ACCESS_KEY_ID + POLLY_AWS_SECRET_ACCESS_KEY.')
    voice = a.voice or ('JBFqnCBsd6RMkjVDRZzb' if provider == 'elevenlabs' else 'Matthew')

    script = json.load(open(os.path.join(ROOT, 'src', 'script.json')))
    lines = script['lines']
    only = set(a.only.split(',')) if a.only else None
    os.makedirs(NARR, exist_ok=True)
    man_path = os.path.join(NARR, 'manifest.json')
    man = json.load(open(man_path)) if os.path.exists(man_path) else {'lines': {}}
    man.update({'provider': provider, 'voice': voice})

    for i, l in enumerate(lines):
        if only and l['id'] not in only:
            continue
        say = l.get('say', l['text'])
        out = os.path.join(NARR, f"{l['id']}.mp3")
        if provider == 'elevenlabs':
            prev = lines[i - 1].get('say', lines[i - 1]['text']) if i else None
            nxt = lines[i + 1].get('say', lines[i + 1]['text']) if i + 1 < len(lines) else None
            elevenlabs(say, voice, prev, nxt, out)
        else:
            polly(say, voice, out, a.region)
        trim(out)
        man['lines'][l['id']] = {'file': f"{l['id']}.mp3", 'duration': round(duration(out), 3)}
        print(f"{l['id']:5} {man['lines'][l['id']]['duration']:6.2f}s  {say[:70]}")

    json.dump(man, open(man_path, 'w'), indent=2)
    print('wrote', man_path, f"total speech {sum(v['duration'] for v in man['lines'].values()):.1f}s")


if __name__ == '__main__':
    main()
