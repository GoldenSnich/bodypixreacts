import React, { useRef } from "react";
// import logo from './logo.svg';
import * as tf from "@tensorflow/tfjs";
import * as bodyPix from "@tensorflow-models/body-pix";
import Webcam from "react-webcam";
import GlobaStyles from "./GlobalStyles";
import "./App.css";

function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  var mobileNetConfig = {
    architecture: 'MobileNetV1',
    outputStride: 8,
    quantBytes: 4,
    multiplier: 1
  }

  var resnetConfig = {
    architecture: 'ResNet50',
    outputStride: 16,
    quantBytes: 4
  };

  const runBodysegment = async () => {
    const net = await bodyPix.load(resnetConfig);
    console.log("BodyPix model loaded.");
    //  Loop and detect hands
    setInterval(() => {
      detect(net);
    }, 1000);
  };

  const detect = async (net) => {
    // Check data is available
    if (
      typeof webcamRef.current !== "undefined" &&
      webcamRef.current !== null &&
      webcamRef.current.video.readyState === 4
    ) {
      // Get Video Properties
      const video = webcamRef.current.video;
      const videoWidth = webcamRef.current.video.videoWidth;
      const videoHeight = webcamRef.current.video.videoHeight;

      // Set video width
      webcamRef.current.video.width = videoWidth;
      webcamRef.current.video.height = videoHeight;

      // Set canvas height and width
      canvasRef.current.width = videoWidth;
      canvasRef.current.height = videoHeight;

      // Make Detections
      // * One of (see documentation below):
      // *   - net.segmentPerson
      // *   - net.segmentPersonParts
      // *   - net.segmentMultiPerson
      // *   - net.segmentMultiPersonParts
      // const person = await net.segmentPerson(video, setState);

      // video 조건
      var setState = {
        flipHorizontal: false,
        internalResolution: 'low',
        segmentationThreshold: 0.7,
        maxDetections: 20, // 최대 인원수
        scoreThreshold: 0.2,
        nmsRadius: 20,
        minKeypointScore: 0.3,
        refineSteps: 10
      }

      const person = await net.segmentMultiPersonParts(video, setState); // video에 조건 추가해서 작동

      document.getElementById("max-person-pre").innerHTML = "수용 인원 : " + setState.maxDetections
      document.getElementById("person-pre").innerHTML = "현재 인원 : " + person.length
      document.getElementById("sat-person-pre").innerHTML = "포화도 : " + Math.floor(person.length / setState.maxDetections * 100) + "%"

      // const coloredPartImage = bodyPix.toMask(person);
      // const coloredPartImage = bodyPix.toColoredPartMask(person);
      // const opacity = 0.7;
      // const flipHorizontal = false;
      // const maskBlurAmount = 0;
      // const canvas = canvasRef.current;

      // bodyPix.drawMask(
      //   canvas,
      //   video,
      //   coloredPartImage,
      //   opacity,
      //   maskBlurAmount,
      //   flipHorizontal
      // );
    }
  };

  runBodysegment();

  return (
    <>
      <GlobaStyles />
      <div className="App">
        <header>
          <div id="title">여유 공간</div>
          <div id="sub-title">방문 지역의 여유 공간 확인 서비스</div>
        </header>
        <div id="content">
          <div id="tab-screen1">
            <div id='main'>
              <Webcam id="webcam" ref={webcamRef} />
              <canvas id="canvasCam" ref={canvasRef} />
            </div>
            <div id="saturation-detection">
              <div id="max-person">
                <h3 id="max-person-pre"></h3>
              </div>
              <div id="person">
                <h3 id="person-pre"></h3>
              </div>
              <div id="saturation">
                <h3 id="sat-person-pre"></h3>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;