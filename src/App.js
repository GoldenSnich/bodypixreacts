import React, { useRef } from "react";
// import logo from './logo.svg';
import * as tf from "@tensorflow/tfjs";
import * as bodyPix from "@tensorflow-models/body-pix";
import Webcam from "react-webcam";
import GlobaStyles from "./GlobalStyles";
import fire from './firebase'
import "./App.css";

function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  var vh;

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

  // video 조건
  var setState = {
    flipHorizontal: false,
    internalResolution: 'low',
    segmentationThreshold: 0.7,
    maxDetections: 30, // 최대 인원수
    scoreThreshold: 0.2,
    nmsRadius: 20,
    minKeypointScore: 0.3,
    refineSteps: 10
  }

  const runBodysegment = async () => {
    const net = await bodyPix.load(resnetConfig);
    console.log("BodyPix model loaded.");
    setInterval(() => {
      detect(net);
      sendDatato();
    }, 1000);
  };

  const detect = async (net) => {
    // video 감지
    if (typeof webcamRef.current !== "undefined" &&
      webcamRef.current !== null &&
      webcamRef.current.video.readyState === 4
    ) {
      const video = webcamRef.current.video; // 현재 video

      // 높이 지정
      if (webcamRef.current.video.videoHeight === 1080)
        vh = (webcamRef.current.video.videoHeight / 3) + "px";
      else
        vh = webcamRef.current.video.videoHeight + "px";

      // const person = await net.segmentPerson(video, setState);

      const person = await net.segmentMultiPersonParts(video, setState); // video에 조건 추가해서 작동

      document.getElementById("max-person-pre").innerHTML = "수용 인원 : " + setState.maxDetections
      document.getElementById("person-pre").innerHTML = "현재 인원 : " + person.length
      document.getElementById("sat-person-pre").innerHTML = "포화도 : " + Math.floor(person.length / setState.maxDetections * 100) + "%"

      // 포화도에 따른 여유, 적정, 포화 표시
      if (Math.floor(person.length / setState.maxDetections * 100) <= 30) {
        document.getElementById("low").style.display = "block";
        document.getElementById("proper").style.display = "none";
        document.getElementById("max").style.display = "none";
      } else if (Math.floor(person.length / setState.maxDetections * 100) <= 70) {
        document.getElementById("low").style.display = "none";
        document.getElementById("proper").style.display = "block";
        document.getElementById("max").style.display = "none";
      } else {
        document.getElementById("low").style.display = "none";
        document.getElementById("proper").style.display = "none";
        document.getElementById("max").style.display = "block";
      }

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

  const sendDatato = async() => {
    fire.database().ref('PlaceDB/Place/스타벅스 건대입구').set({
      bookmark: true,
      bookmarkSetting: true,
      pinfo: "스타벅스 건대입구 정보",
      pmaxNum: 20,
      pname: "스타벅스 건대입구",
      pnum: 5
    });
    console.log("Data send");
  }

  runBodysegment();

  return (
    <>
      <GlobaStyles />
      <div className="App">
        <header id="Header">
          <div id="title">여유 공간</div>
          <div id="sub-title">방문 지역의 여유 공간 확인 서비스</div>
        </header>
        <div id="content">
          <div id="tab-screen1">
            <div id='main'>
              <Webcam id="webcam" ref={webcamRef} style={{ width: "640px", height: vh }} />
              <canvas id="canvasCam" ref={canvasRef} style={{ width: "640px", height: vh }} />
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

          <div id="present_max">
            <div id="low">
              <h3 id="low_txt">여유</h3>
            </div>
            <div id="proper">
              <h3 id="proper_txt">적정</h3>
            </div>
            <div id="max">
              <h3 id="max_txt">포화</h3>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;