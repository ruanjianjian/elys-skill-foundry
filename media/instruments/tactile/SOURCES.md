# CC0 instrument excerpts

These files contain individual instrument notes, not excerpts from a song. The
score's notes, timing, harmony and hand-percussion synthesis are original. Both
source instruments are explicitly offered under CC0 by their publisher. The
unmodified dedication and original package readme are included for each source.

## Upright Piano KW

- Publisher's instrument/license page: <https://freepats.zenvoid.org/Piano/acoustic-grand-piano.html#UprightKW>
- Actual source archive: <https://freepats.zenvoid.org/Piano/UprightPianoKW/UprightPianoKW-small-SFZ-20190703.7z>
- Package: `UprightPianoKW-small-SFZ-20190703`; instrument recorded by Gonzalo and Roberto in January 2017, edited by Roberto.
- License: CC0 1.0; original [dedication](LICENSE-piano-CC0.txt) and [readme](SOURCE-piano-readme.txt).

| Distributed excerpt | Original archive member | MIDI root | Kept duration |
| --- | --- | ---: | ---: |
| `piano-b2.wav` | `samples/B2vH.wav` | 47 | First 4.8 s |
| `piano-c4.wav` | `samples/C4vH.wav` | 60 | First 4.8 s |
| `piano-c5.wav` | `samples/C5vH.wav` | 72 | Full 3.47 s (4.0 s trim ceiling) |

## Spanish classical guitar

- Publisher's instrument/license page: <https://freepats.zenvoid.org/Guitar/acoustic-guitar.html>
- Actual source archive: <https://freepats.zenvoid.org/Guitar/SpanishClassicalGuitar/SpanishClassicalGuitar-SFZ-20190618.7z>
- Package: `SpanishClassicalGuitar-SFZ-20190618`; created by Roberto from his 2008 recording with an AKG Perception 120 microphone.
- License: CC0 1.0; original [dedication](LICENSE-nylon-CC0.txt) and [readme](SOURCE-nylon-readme.txt).

| Distributed excerpt | Original archive member | MIDI root | Kept duration |
| --- | --- | ---: | ---: |
| `nylon-e2.wav` | `samples/E2.wav` | 40 | First 2.2 s |
| `nylon-c3.wav` | `samples/C3.wav` | 48 | First 2.2 s |
| `nylon-c4.wav` | `samples/C4.wav` | 60 | First 1.8 s |
| `nylon-g4.wav` | `samples/G4.wav` | 67 | First 1.6 s |

All excerpts were converted with FFmpeg to mono 22050 Hz PCM16 WAV and trimmed
only at the end to reduce distribution size. No normalization, denoising or
additional source media was applied. MIDI roots were read from each package's
SFZ mapping. `score_tactile.py` resamples these short notes to 48000 Hz during
rendering and shapes their release; its quiet string ensemble, conga and shaker
are deterministic NumPy synthesis. No external audio engine or sample package is
required at runtime. The sound has not been verified by human listening.

CC0 reference: <https://creativecommons.org/publicdomain/zero/1.0/>.
