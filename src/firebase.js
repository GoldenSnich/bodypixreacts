import firebase from "firebase";

const firebaseConfig = {
    apiKey: "AIzaSyBnmJA6Hz3VotMVDoO5kzq91b86mBnbt_E",
    authDomain: "saturation-54703.firebaseapp.com",
    databaseURL: "https://saturation-54703-default-rtdb.firebaseio.com",
    projectId: "saturation-54703",
    storageBucket: "saturation-54703.appspot.com",
    messagingSenderId: "763871829201",
    appId: "1:763871829201:web:0430699dc86d6edae3b9f0",
    measurementId: "G-0X16C0BL1C"
};

var fire = firebase.initializeApp(firebaseConfig);;
export default fire;