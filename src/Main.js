import React from "react";
import { withRouter } from "react-router-dom";
import styled from "styled-components";

const Title = styled.div`
    margin-top: 20px;
    height: 50px;
    font-size: 40px;
    text-align: center;
    color: #00FFFF;
`;

const SubTitle = styled.div`
    margin-top: 10px;
    height: 50px;
    font-size: 20px;
    text-align: center;
    color: white;
`;

const Content = styled.div`
    width: 1260px;
    margin-top: 20px;
    overflow: hidden;
`;

const Screen = styled.div`
    margin-top: 10px;
    width: 100%;
    text-align: center;
    position: relative;
    font-weight: bold;
`;

const Video = styled.video`
    display: none;
`;

const Saturation = styled.div`
    float: right;
    margin-top: 10px;
    margin-right: 90px;
    width: 170px;
    color: #00FFFF;
`;

const Present = styled.div`
    padding: 10px;
    width: 100%;
    height: 30px;
    border: 2px solid #00FFFF;
    color: #00FFFF;
    line-height: 0px;
    :not(1) {
        margin-top: 40px;
    }
`;

export default withRouter(({ location: { pathname } }) => (
    <>
        <div>
            <Title>여유 공간</Title>
            <SubTitle>방문 지역의 여유 공간 확인 서비스</SubTitle>
        </div>
        <Content>
            <Screen>
                <div id='main'>
                    <Video id="video"></Video>
                    <canvas id="output" />
                </div>
                <Saturation>
                    <Present>
                        <h3 id="max-person-pre">수용 인원 : 20</h3>
                    </Present>
                    <Present>
                        <h3 id="person-pre"></h3>
                    </Present>
                    <Present>
                        <h3 id="sat-person-pre"></h3>
                    </Present>
                </Saturation>
            </Screen>
        </Content>
        <div id="stats"></div>
        <div id="info"></div>
        <div id="loading">
            <div class="spinner-text">Loading BodyPix model...</div>
            <div class="sk-spinner sk-spinner-pulse"></div>
        </div>
        <script src="body.js"></script>
    </>
));