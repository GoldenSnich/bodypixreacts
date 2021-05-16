/**
 * @license
 * Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
import '@tensorflow/tfjs-backend-webgl';
import * as bodyPix from '@tensorflow-models/body-pix';
import dat from 'dat.gui';
import Stats from 'stats.js';
import { drawKeypoints, drawSkeleton, toggleLoadingUI, TRY_RESNET_BUTTON_NAME, TRY_RESNET_BUTTON_TEXT, updateTryResNetButtonDatGuiCss } from './demo_util';
import * as partColorScales from './part_color_scales'; // colorScale : rainbow, warm, spectral (3가지)

const stats = new Stats();

const state = {
  video: null,
  stream: null,
  net: null,
  videoConstraints: {},
  // Triggers the TensorFlow model to reload
  changingArchitecture: false,
  changingMultiplier: false,
  changingStride: false,
  changingResolution: false,
  changingQuantBytes: false,
};

function isAndroid() { // 안드로이드
  return /Android/i.test(navigator.userAgent);
}

function isiOS() { // iOS
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isMobile() { // 모바일
  return isAndroid() || isiOS();
}

async function getVideoInputs() {
  // enumerateDevices : 사용(또는 접근)이 가능한 미디어 입력장치나 출력장치들의 리스트를 가져옴
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) { // 장치 인식 안되면?
    console.log('enumerateDevices() not supported.');
    return [];
  }

  const devices = await navigator.mediaDevices.enumerateDevices();

  const videoDevices = devices.filter(device => device.kind === 'videoinput');

  return videoDevices;
}

/* 비디오 캡쳐 멈춤 */
function stopExistingVideoCapture() {
  if (state.video && state.video.srcObject) {
    state.video.srcObject.getTracks().forEach(track => {
      track.stop();
    })
    state.video.srcObject = null;
  }
}

/* 비디오 장치 ID(이름?) 리턴 함수 */
async function getDeviceIdForLabel(cameraLabel) {
  const videoInputs = await getVideoInputs(); // 비디오 가져옴

  for (let i = 0; i < videoInputs.length; i++) {
    const videoInput = videoInputs[i];
    if (videoInput.label === cameraLabel)
      return videoInput.deviceId;
  }

  return null;
}

// on mobile, facing mode is the preferred way to select a camera.
// Here we use the camera label to determine if its the environment or user facing camera
function getFacingMode(cameraLabel) { // 모바일에서만 사용
  if (!cameraLabel)
    return 'user';

  if (cameraLabel.toLowerCase().includes('back'))
    return 'environment'; // 후면 카메라
  else
    return 'user'; // 전면 카메라
}

async function getConstraints(cameraLabel) {
  let deviceId;
  let facingMode;

  if (cameraLabel) {
    deviceId = await getDeviceIdForLabel(cameraLabel); // 비디오 장치 ID(이름?) 가져옴
    facingMode = isMobile() ? getFacingMode(cameraLabel) : null; // 모바일이면 FacingMode 사용, 아니면 사용 X
  };
  return { deviceId, facingMode };
}

/* demo 사용하기 위해 카메라 로드 */
async function setupCamera(cameraLabel) {
  // 장치 가져오기 실패 시 or 사용자에게 미디어 입력 장치 사용 권한을 요청 실패 시 (getUserMedia)
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error(
      'Browser API navigator.mediaDevices.getUserMedia not available');
  }

  const videoElement = document.getElementById('video'); // index.html의 id가 video인 태그 (기존 비디오)

  stopExistingVideoCapture();

  const videoConstraints = await getConstraints(cameraLabel); // 비디오 가져옴

  const stream = await navigator.mediaDevices.getUserMedia({ 'audio': false, 'video': videoConstraints }); // 권한 요청 (audio X)
  videoElement.srcObject = stream;

  return new Promise((resolve) => {
    videoElement.onloadedmetadata = () => {
      videoElement.width = videoElement.videoWidth; // 비디오 너비
      videoElement.height = videoElement.videoHeight; // 비디오 높이
      resolve(videoElement);
    };
  });
}

/* 비디오 로드 */
async function loadVideo(cameraLabel) {
  try {
    state.video = await setupCamera(cameraLabel); // 카메라 로드
  } catch (e) {
    let info = document.getElementById('info'); // 카메라 로드 실패 시
    info.textContent = 'this browser does not support video capture, or this device does not have a camera';
    info.style.display = 'block';
    throw e;
  }

  state.video.play(); // 비디오 실행
}

const defaultQuantBytes = 2;

const defaultMobileNetMultiplier = isMobile() ? 0.50 : 0.75;
const defaultMobileNetStride = 16;
const defaultMobileNetInternalResolution = 'medium';

const defaultResNetMultiplier = 1.0;
const defaultResNetStride = 16;
const defaultResNetInternalResolution = 'low';

/* GUI 목록 (우측) */
const guiState = {
  algorithm: 'multi-person-instance',
  estimate: 'partmap', // partmap : 사람 (rainbow), 배경 (흰색) / segmentation : 사람 (흰색), 배경 (검은색)
  camera: null,
  flipHorizontal: true, // 좌우 반전
  input: {
    architecture: 'MobileNetV1',
    outputStride: 16, // 보폭? (16이 더 잘나옴)
    internalResolution: 'low', // 얼마나 세부적으로 나누는지 (low, medium, high, full)
    multiplier: 0.50,
    quantBytes: 2
  },

  multiPersonDecoding: {
    maxDetections: 5, // 최대 사람 감지 수
    scoreThreshold: 0.3,
    nmsRadius: 20,
    numKeypointForMatching: 17,
    refineSteps: 10
  },

  segmentation: {
    segmentationThreshold: 0.7, // rainbow 너비 (클수록 너비 작아짐)
    effect: 'mask', // mask, bokeh (차이 모름)
    maskBackground: true,
    opacity: 0.7,
    backgroundBlurAmount: 3,
    maskBlurAmount: 0,
    edgeBlurAmount: 3
  },

  partMap: {
    segmentationThreshold: 0.5,
    effect: 'partMap', // partmap : rainbow / pixelation : 픽셀 / blurBodyPart : 얼굴만 blur 처리
    opacity: 0.9, // 픽셀일 때만 투명도 적용됨
    colorScale: 'rainbow', // rainbow, warm, spectral (3가지 색 표현)
    blurBodyPartAmount: 3, // blurbodyPark일 때만 적용 / 얼마나 blur 처리되는지 (클수록 많이 blur)
    bodyPartEdgeBlurAmount: 3,
  },

  showFps: !isMobile() // 좌측 상단 fps 표시 여부
};

function toCameraOptions(cameras) {
  const result = { default: null };

  cameras.forEach(camera => {
    result[camera.label] = camera.label;
  })

  return result;
}

/* GUI 컨트롤러 설정 (우측 상단) */
function setupGui(cameras) {
  const gui = new dat.GUI({ width: 300 }); // width : 300으로 설정

  let architectureController = null;
  guiState[TRY_RESNET_BUTTON_NAME] = function () {
    architectureController.setValue('ResNet50') // reset 버튼을 누르면 Input의 architecture 설정
  };
  gui.add(guiState, TRY_RESNET_BUTTON_NAME).name(TRY_RESNET_BUTTON_TEXT); // reset 버튼 html에 등록
  updateTryResNetButtonDatGuiCss(); // reset 버튼 css 적용

  gui.add(guiState, 'camera', toCameraOptions(cameras)) // 카메라 적용
    .onChange(async function (cameraLabel) {
      state.changingCamera = true;

      await loadVideo(cameraLabel);

      state.changingCamera = false;
    });
}

/* fps 설정 (값에 따라 달라짐 - 클릭 시 변경) */
function setupFPS() {
  stats.showPanel(0); // 0 : fps, 1 : ms, 2 : mb, 3+ : custom
  if (guiState.showFps)
    document.body.appendChild(stats.dom);
}

/* algorithm에 따라 설정 */
async function estimateSegmentation() {
  let multiPersonSegmentation = null;
  switch (guiState.algorithm) {
    case 'multi-person-instance':
      return await state.net.segmentMultiPerson(state.video, {
        internalResolution: guiState.input.internalResolution,
        segmentationThreshold: guiState.segmentation.segmentationThreshold,
        maxDetections: guiState.multiPersonDecoding.maxDetections,
        scoreThreshold: guiState.multiPersonDecoding.scoreThreshold,
        nmsRadius: guiState.multiPersonDecoding.nmsRadius,
        numKeypointForMatching: guiState.multiPersonDecoding.numKeypointForMatching,
        refineSteps: guiState.multiPersonDecoding.refineSteps
      });
    case 'person':
      return await state.net.segmentPerson(state.video, {
        internalResolution: guiState.input.internalResolution,
        segmentationThreshold: guiState.segmentation.segmentationThreshold,
        maxDetections: guiState.multiPersonDecoding.maxDetections,
        scoreThreshold: guiState.multiPersonDecoding.scoreThreshold,
        nmsRadius: guiState.multiPersonDecoding.nmsRadius,
      });
    default: break;
  };

  return multiPersonSegmentation;
}

/* estimate에 따라 설정 */
async function estimatePartSegmentation() {
  switch (guiState.algorithm) {
    case 'multi-person-instance':
      return await state.net.segmentMultiPersonParts(state.video, {
        internalResolution: guiState.input.internalResolution,
        segmentationThreshold: guiState.segmentation.segmentationThreshold,
        maxDetections: guiState.multiPersonDecoding.maxDetections,
        scoreThreshold: guiState.multiPersonDecoding.scoreThreshold,
        nmsRadius: guiState.multiPersonDecoding.nmsRadius,
        numKeypointForMatching: guiState.multiPersonDecoding.numKeypointForMatching,
        refineSteps: guiState.multiPersonDecoding.refineSteps
      });
    case 'person':
      return await state.net.segmentPersonParts(state.video, {
        internalResolution: guiState.input.internalResolution,
        segmentationThreshold: guiState.segmentation.segmentationThreshold,
        maxDetections: guiState.multiPersonDecoding.maxDetections,
        scoreThreshold: guiState.multiPersonDecoding.scoreThreshold,
        nmsRadius: guiState.multiPersonDecoding.nmsRadius,
      });
    default: break;
  };
  return multiPersonPartSegmentation;
}

function drawPoses(personOrPersonPartSegmentation, flipHorizontally, ctx) {
  if (Array.isArray(personOrPersonPartSegmentation)) {
    personOrPersonPartSegmentation.forEach(personSegmentation => {
      let pose = personSegmentation.pose;
      if (flipHorizontally)
        pose = bodyPix.flipPoseHorizontal(pose, personSegmentation.width);
      drawKeypoints(pose.keypoints, 0.1, ctx);
      drawSkeleton(pose.keypoints, 0.1, ctx);
    });
  } else {
    personOrPersonPartSegmentation.allPoses.forEach(pose => {
      if (flipHorizontally) {
        pose = bodyPix.flipPoseHorizontal(
          pose, personOrPersonPartSegmentation.width);
      }
      drawKeypoints(pose.keypoints, 0.1, ctx);
      drawSkeleton(pose.keypoints, 0.1, ctx);
    })
  }
  document.getElementById("person-pre").innerHTML = "현재 인원 : "+ personOrPersonPartSegmentation.length
  document.getElementById("sat-person-pre").innerHTML = "포화도 : " + (personOrPersonPartSegmentation.length / 20)*100 + "%"
}

async function loadBodyPix() {
  toggleLoadingUI(true);
  state.net = await bodyPix.load({
    architecture: guiState.input.architecture,
    outputStride: guiState.input.outputStride,
    multiplier: guiState.input.multiplier,
    quantBytes: guiState.input.quantBytes
  });
  toggleLoadingUI(false);
}

/* Feeds an image to BodyPix to estimate segmentation - this is where the magic happens. This function loops with a requestAnimationFrame method. */
function segmentBodyInRealTime() {
  const canvas = document.getElementById('output');
  // since images are being fed from a webcam

  async function bodySegmentationFrame() {
    // if changing the model or the camera, wait a second for it to complete
    // then try again.
    if (state.changingArchitecture || state.changingMultiplier || state.changingCamera || state.changingStride || state.changingQuantBytes) {
      console.log('load model...');
      loadBodyPix();
      state.changingArchitecture = false;
      state.changingMultiplier = false;
      state.changingStride = false;
      state.changingQuantBytes = false;
    }

    // Begin monitoring code for frames per second
    stats.begin();

    const flipHorizontally = guiState.flipHorizontal;

    switch (guiState.estimate) {
      case 'segmentation':
        const multiPersonSegmentation = await estimateSegmentation();
        switch (guiState.segmentation.effect) {
          case 'mask':
            const ctx = canvas.getContext('2d');
            const foregroundColor = { r: 255, g: 255, b: 255, a: 255 };
            const backgroundColor = { r: 0, g: 0, b: 0, a: 255 };
            const mask = bodyPix.toMask(
              multiPersonSegmentation, foregroundColor, backgroundColor,
              true);

            bodyPix.drawMask(
              canvas, state.video, mask, guiState.segmentation.opacity,
              guiState.segmentation.maskBlurAmount, flipHorizontally);
            drawPoses(multiPersonSegmentation, flipHorizontally, ctx);
            break;
          case 'bokeh':
            bodyPix.drawBokehEffect(
              canvas, state.video, multiPersonSegmentation,
              +guiState.segmentation.backgroundBlurAmount,
              guiState.segmentation.edgeBlurAmount, flipHorizontally);
            break;
        }

        break;
      case 'partmap':
        const ctx = canvas.getContext('2d');
        const multiPersonPartSegmentation = await estimatePartSegmentation();
        const coloredPartImageData = bodyPix.toColoredPartMask(
          multiPersonPartSegmentation,
          partColorScales[guiState.partMap.colorScale]);

        const maskBlurAmount = 0;
        switch (guiState.partMap.effect) {
          case 'pixelation':
            const pixelCellWidth = 10.0;

            bodyPix.drawPixelatedMask(
              canvas, state.video, coloredPartImageData,
              guiState.partMap.opacity, maskBlurAmount, flipHorizontally,
              pixelCellWidth);
            break;
          case 'partMap':
            bodyPix.drawMask(
              canvas, state.video, coloredPartImageData, guiState.opacity,
              maskBlurAmount, flipHorizontally);
            break;
          case 'blurBodyPart':
            const blurBodyPartIds = [0, 1];
            bodyPix.blurBodyPart(
              canvas, state.video, multiPersonPartSegmentation,
              blurBodyPartIds, guiState.partMap.blurBodyPartAmount,
              guiState.partMap.edgeBlurAmount, flipHorizontally);
        }
        drawPoses(multiPersonPartSegmentation, flipHorizontally, ctx);
        break;
      default:
        break;
    }

    // End monitoring code for frames per second
    stats.end();

    requestAnimationFrame(bodySegmentationFrame);
  }

  bodySegmentationFrame();
}

/**
 * Kicks off the demo.
 */
export async function bindPage() {
  // Load the BodyPix model weights with architecture 0.75
  await loadBodyPix();
  document.getElementById('loading').style.display = 'none';
  document.getElementById('main').style.display = 'inline-block';

  await loadVideo(guiState.camera);

  let cameras = await getVideoInputs();

  setupFPS();
  setupGui(cameras);

  segmentBodyInRealTime();
}


navigator.getUserMedia = navigator.getUserMedia ||
  navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
// kick off the demo
bindPage();