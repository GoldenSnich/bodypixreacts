import React, { useRef } from "react";
// import logo from './logo.svg';
import * as tf from "@tensorflow/tfjs";
import * as bodyPix from "@tensorflow-models/body-pix";
import Webcam from "react-webcam";
import GlobaStyles from "./GlobalStyles";
import fire from './firebase'
import "./App.css";
import PropTypes, { array } from "prop-types";

const App = ({
  outdoor,
  max_per,
  now_per,
  storeInfo,
  storeName
}) => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  var vh

  var isEnrol = false;

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
    internalResolution: 'high',
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
      // sendDataToDB();
    }, 1000);
  };

  const detect = async (net) => {
    // video 감지
    if (typeof webcamRef.current !== "undefined" &&
      webcamRef.current !== null &&
      webcamRef.current.video.readyState === 4
    ) {
      const video = webcamRef.current.video; // 현재 video
      // 높이 및 margin-bottom 지정
      if (webcamRef.current.video.videoHeight === 1080) { // 웹 캠
        vh = (webcamRef.current.video.videoHeight / 3) + "px";
        document.getElementById("tab_screen").style.marginBottom = '0';
      } else { // obs 화면
        vh = webcamRef.current.video.videoHeight + "px";
        document.getElementById("tab_screen").style.marginBottom = '120px';
      }

      // const person = await net.segmentPerson(video, setState);

      const person = await net.segmentMultiPersonParts(video, setState); // video에 조건 추가해서 작동

      document.getElementById("max-person-pre").innerHTML = "수용 인원 : " + setState.maxDetections
      document.getElementById("person-pre").innerHTML = "현재 인원 : " + person.length
      document.getElementById("sat-person-pre").innerHTML = "포화도 : " + Math.floor(person.length / setState.maxDetections * 100) + "%"

      // 포화도에 따른 여유, 적정, 포화 표시
      if (now_per <= 30) {
        document.getElementById("low").style.display = "block";
        document.getElementById("proper").style.display = "none";
        document.getElementById("max").style.display = "none";
      } else if (now_per <= 70) {
        document.getElementById("low").style.display = "none";
        document.getElementById("proper").style.display = "block";
        document.getElementById("max").style.display = "none";
      } else {
        document.getElementById("low").style.display = "none";
        document.getElementById("proper").style.display = "none";
        document.getElementById("max").style.display = "block";
      }

      now_per = person.length;
      outdoor = document.getElementById("outdoor").value; // 실내, 실외
      max_per = document.getElementById("max_person").value; // 최대 인원
      storeName = document.getElementById("store_name").value; // 가게 이름
      storeInfo = document.getElementById("store_info").value; // 가게 정보

      // console.log(outdoor + " " + max_per + " " + now_per + " " + storeName + " " + storeInfo);

      if (isEnrol) {
        console.log(`${storeInfo}` + " " + `${max_per}` + " " + `${storeName}` + " " + `${now_per}` + " " + `${outdoor}`);
        fire.database().ref(`PlaceDB/Place/${storeName}`).set({
          bookmark: true,
          bookmarkSetting: true,
          pinfo: `${storeInfo}`,
          pmaxNum: Number.parseInt(max_per),
          pname: `${storeName}`,
          pnum: Number.parseInt(now_per),
          pside: `${outdoor}`
        });
        console.log("Data send");
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

  const sendDataToDB = async () => {
    isEnrol = true;
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
          <div id="tab_screen">
            <div id='main'>
              <Webcam id="webcam" ref={webcamRef} style={{ width: "640px", height: vh }} />
              <canvas id="canvasCam" ref={canvasRef} style={{ width: "640px", height: vh }} />
            </div>
            <div id="saturation-detection">
              <div id="max-person">
                <p id="max-person-pre"></p>
              </div>
              <div id="person">
                <p id="person-pre"></p>
              </div>
              <div id="saturation">
                <p id="sat-person-pre"></p>
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
          <div id="text_input">
            <div id="other_div">
              <div>
                <p>실내/실외 : </p>
                <input type="text" id="outdoor" name="outdoor" placeholder="ex) 실내" />
              </div>
              <div>
                <p>최대 인원 : </p>
                <input type="text" id="max_person" name="max" placeholder="ex) 30" />
              </div>
              <div>
                <p>가게 이름 : </p>
                <input type="text" id="store_name" name="storeName" placeholder="ex) 스타벅스" />
              </div>
            </div>
            <div id="store_div">
              <p>가게 정보</p>
              <textarea id="store_info" name="store" placeholder="ex) 주소, 정보 등" />
            </div>
          </div>
          <button onClick={sendDataToDB}>등록</button>
        </div>
      </div>
    </>
  );
}

App.propTypes = {
  outdoor: PropTypes.string,
  max_per: PropTypes.number,
  storeInfo: PropTypes.string,
  storeName: PropTypes.string
}

export default App;