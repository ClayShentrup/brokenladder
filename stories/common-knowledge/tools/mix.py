#!/usr/bin/env python3
"""Mix narration, music cues, rain bed and effects into out/mix.wav, timed from out/cues.json.

Music sits low and ducks under the voice (sidechain compression). Loudness is set with a
static gain to -14 LUFS plus a peak limiter (no riding gain, so nothing pumps)."""
import json, os, re, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'out')
cues = json.load(open(os.path.join(OUT, 'cues.json')))
total = cues['total']
start = {l['id']: l['start'] for l in cues['lines']}

# music cues: (file, start, fade-in, end, fade-out)
MUSIC = [
    ('m1', 0.0, 3.0, start['S10'] - 0.3, 2.5),
    ('m2', start['S10'] - 1.5, 1.5, start['S23'] - 0.2, 3.0),
    ('m3', start['S23'] - 1.0, 1.0, start['S33'] - 0.2, 3.0),
    ('m4', start['S33'] - 1.0, 2.0, start['S49'] - 3.0, 6.0),
    ('m5', start['S49'] - 10.0, 6.0, cues['events'][-1]['t'] - 0.2, 0.4),
]
filt = []
files = []
def lufs(path):
    m = subprocess.run(['ffmpeg', '-hide_banner', '-i', path, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    return float(re.findall(r'I:\s+(-?[\d.]+) LUFS', m)[-1])
VO_REF = -24.0      # raw narration loudness
MUSIC_UNDER = 16.0  # music sits this many dB under the voice, before ducking
RAIN_UNDER = 21.0
def inp(path, pre=None):
    files.append((path, pre or []))
    return len(files) - 1

# narration bus
vo = []
for l in cues['lines']:
    i = inp(os.path.join(ROOT, 'narration', l['id'] + '.mp3'))
    ms = int(round(l['start'] * 1000))
    filt.append(f'[{i}:a]aresample=48000,aformat=channel_layouts=stereo,afade=t=in:d=0.02,adelay={ms}|{ms}[v{i}]')
    vo.append(f'[v{i}]')
filt.append(f'{"".join(vo)}amix=inputs={len(vo)}:normalize=0,apad=whole_dur={total:.3f}[vo]')
filt.append('[vo]asplit=2[vomix][vokey]')
# music bus
mu = []
for name, t0, fi, t1, fo in MUSIC:
    mp = os.path.join(ROOT, 'music', name + '.mp3'); i = inp(mp)
    vol = VO_REF - MUSIC_UNDER - lufs(mp)
    dur = max(1.0, t1 - t0)
    ms = int(round(t0 * 1000))
    filt.append(f'[{i}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:{dur:.3f},afade=t=in:d={fi},afade=t=out:st={max(0, dur - fo):.3f}:d={fo},volume={vol:.1f}dB,adelay={ms}|{ms}[m{i}]')
    mu.append(f'[m{i}]')
filt.append(f'{"".join(mu)}amix=inputs={len(mu)}:normalize=0,apad=whole_dur={total:.3f}[mus]')
filt.append('[mus][vokey]sidechaincompress=threshold=0.03:ratio=6:attack=40:release=600:makeup=1[musd]')
# rain bed, looped
rp = os.path.join(ROOT, 'sfx', 'rain.mp3'); i = inp(rp, ['-stream_loop', '-1']); rv = VO_REF - RAIN_UNDER - lufs(rp)
filt.append(f'[{i}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:{total:.3f},volume={rv:.1f}dB,afade=t=in:d=3,afade=t=out:st={total - 6:.3f}:d=5[rain]')
# effects
fx = []
for e in cues['events']:
    i = inp(os.path.join(ROOT, 'sfx', e['name'] + '.mp3'))
    ms = int(round(max(0, e['t']) * 1000)); g = 20 * __import__('math').log10(max(0.01, e.get('gain', 1))) - 8
    filt.append(f'[{i}:a]aresample=48000,aformat=channel_layouts=stereo,volume={g:.1f}dB,adelay={ms}|{ms}[f{i}]')
    fx.append(f'[f{i}]')
filt.append(f'{"".join(fx)}amix=inputs={len(fx)}:normalize=0,apad=whole_dur={total:.3f}[fx]')
filt.append('[vomix][musd][rain][fx]amix=inputs=4:normalize=0,atrim=0:%.3f[out]' % total)

pre = os.path.join(OUT, 'mix_pre.wav')
cmd = ['ffmpeg', '-y', '-loglevel', 'error']
for p, extra in files: cmd += extra + ['-i', p]
cmd += ['-filter_complex', ';'.join(filt), '-map', '[out]', '-ar', '48000', '-c:a', 'pcm_s16le', pre]
subprocess.run(cmd, check=True)
meas = subprocess.run(['ffmpeg', '-hide_banner', '-i', pre, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
I = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', meas)[-1])
gain = -14 - I
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', pre, '-af', f'volume={gain:.2f}dB,alimiter=limit=0.79:attack=5:release=60:level=disabled', '-ar', '48000', '-c:a', 'pcm_s16le', os.path.join(OUT, 'mix.wav')], check=True)
os.remove(pre)
print(f'mix: {I:.1f} LUFS before, gain {gain:+.2f} dB, {total:.1f}s')
