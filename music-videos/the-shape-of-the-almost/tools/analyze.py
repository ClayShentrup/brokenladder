import sys, json, numpy as np, librosa
y, sr = librosa.load(sys.argv[1], sr=22050, mono=True)
dur = len(y) / sr
tempo, beats = librosa.beat.beat_track(y=y, sr=sr, start_bpm=117, units='time', tightness=200)
onset_env = librosa.onset.onset_strength(y=y, sr=sr)
# energy per second
hop = 512
rms = librosa.feature.rms(y=y, hop_length=hop)[0]
t = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop)
sec = np.array([rms[(t >= i) & (t < i + 1)].mean() for i in range(int(dur))])
# structural segmentation on chroma + mfcc
chroma = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=hop)
mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13, hop_length=hop)
feat = np.vstack([librosa.util.normalize(chroma, axis=1), librosa.util.normalize(mfcc, axis=1)])
bounds = librosa.segment.agglomerative(feat, 14)
bt = librosa.frames_to_time(bounds, sr=sr, hop_length=hop)
print('duration', round(dur, 2), 'tempo', np.round(tempo, 2), 'beats', len(beats), 'first beats', np.round(beats[:8], 3))
ib = np.diff(beats); print('median beat interval', round(float(np.median(ib)), 4), '-> bpm', round(60 / float(np.median(ib)), 2))
print('segment boundaries (s):', [round(float(x), 1) for x in bt])
print('energy per 4s (rms*1000):')
for i in range(0, int(dur), 4): print(f'{i:4d}s', '#' * int(sec[i:i+4].mean() * 400), round(float(sec[i:i+4].mean() * 1000), 1))
json.dump({'duration': dur, 'beats': [float(b) for b in beats], 'bounds': [float(b) for b in bt], 'rms_per_sec': [float(v) for v in sec]}, open(sys.argv[2], 'w'))
