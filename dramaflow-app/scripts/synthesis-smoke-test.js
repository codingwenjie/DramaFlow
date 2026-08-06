/**
 * 本地视频合成冒烟测试：
 * 构造 3 个测试镜头 + 1 段中文配音，调用 runSynthesis 产出真实 MP4。
 * 运行：npm run build:electron && node scripts/synthesis-smoke-test.js
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { runSynthesis } = require('../dist-electron/synthesis.js');

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'dramaflow-smoke-'));

function makeTestImage(file) {
  execFileSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'color=c=0x2A2D31:s=540x960', '-frames:v', '1', file], {
    stdio: 'ignore',
  });
  return fs.readFileSync(file).toString('base64');
}

const shots = [];
for (let i = 1; i <= 3; i++) {
  const imgFile = path.join(work, `img-${i}.png`);
  shots.push({
    id: `#00${i}`,
    scene: 1,
    index: i,
    imageBase64: makeTestImage(imgFile),
    duration: 2,
    desc: `测试镜头 ${i}`,
    type: '中景',
    angle: '平视',
    lineId: i === 2 ? 'l1' : undefined,
  });
}

const job = {
  projectId: 'smoke-test',
  projectName: '本地合成冒烟测试',
  shots,
  lines: [
    {
      id: 'l1',
      scene: 1,
      character: '测试角色',
      text: '这是一段用于验证本地配音合成的测试台词。',
      speed: 1.0,
      volume: 80,
    },
  ],
  fps: 30,
  width: 1080,
  height: 1920,
};

const outDir = path.join(work, 'exports');

runSynthesis(job, (p) => console.log(`  [${p.percent}%] ${p.message}`), outDir).then((res) => {
  console.log('RESULT:', JSON.stringify(res, null, 2));
  if (!res.ok || !res.outputPath || !fs.existsSync(res.outputPath)) {
    console.error('SMOKE TEST FAILED');
    process.exit(1);
  }
  console.log('SMOKE TEST PASSED:', res.outputPath);
});
