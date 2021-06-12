Body Pix 모델을 이용한 인구포화도 체크 서비스

https://saturation-54703.web.app/ - deploy site
관련정보 입력후 등록 선택시 데이터베이스로 전송

※정확도 및 속도 관련 요소

신경망 모델 (ResNet, MoblileNet)

Multiplier : CVN의 깊이(반복 분석 횟수) 클수록 정확도△ 속도▽  (Only MobileNet, 0.25~1)

Output Stride : 입력 이미지크기와 출력 피쳐 맵 크기의 비율 작을수록 정확도△ 속도▽ (8~32)

Quant Bytes : 신경망 양자화를 통해 연산기준 byter값 설정 클수록 정확도△ 속도▽ (1~4 bytes)

Internal Resolution : 내부 해상도 백분율 클수록 정확도△ 속도▽ 

Mask함수 : 높은 할당값을 가진 피사체를 색칠해주는 함수 프로그램 CPU,GPU,메모리 사용 큰 영향

→ 정확도 관련 설정 최대화 , mask함수 사용X, 모델 Load Interval

Resolution 만 high 로 설정 그외설정 최대 설정으로 선택
