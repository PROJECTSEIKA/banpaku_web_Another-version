
import React, { useEffect, useMemo, useRef, useState } from "react";
import './style.css'; // style.cssを再度有効化
import {
  nowInSec,
  SkyWayAuthToken,
  SkyWayContext,
  SkyWayRoom,
  SkyWayStreamFactory,
  uuidV4,
  RemoteDataStream, // RemoteDataStreamをインポート
  RemoteVideoStream, // RemoteVideoStreamをインポート
  RemoteAudioStream, // RemoteAudioStreamをインポート
} from '@skyway-sdk/room';

/**
 * ホーム画面コンポーネント
 * @param {object} props - プロパティ
 * @param {function} props.setIsLoggedIn - ログイン状態を設定する関数
 */
function Home({ setIsLoggedIn }) {
  // ルーム名
  const [roomName, setRoomName] = useState("");
  // 自分の参加者情報 (ルームに参加すると設定されます)
  const [me, setMe] = useState(null);
  // SkyWayコンテキストのインスタンス
  const [skywayContext, setSkywayContext] = useState(null);
  // SkyWayルームのインスタンス
  const [skywayRoom, setSkywayRoom] = useState(null);
  // リモートビデオ要素を管理するためのMap (memberId -> videoElement)
  const remoteVideoElements = useRef(new Map());
  // リモートビデオを表示するDOM要素への参照
  const robotDisplayRef = useRef(null);
  // ローカルストリームの参照を保持
  const localStreamRef = useRef(null);
  // 受信したメッセージを表示するための状態
  // src/home.js
  // eslint-disable-next-line no-unused-vars
  const [receivedMessages, setReceivedMessages] = useState([]);
  // 送信したデータストリームの参照を保持
  const localDataStreamRef = useRef(null); // LocalDataStreamの参照を保持
  // マイクの状態を表示するための状態 (ミュート状態を管理)
  const [isMuted, setIsMuted] = useState(false);
  // オーディオストリームのPublicationを保持するための参照
  const audioPublicationRef = useRef(null);
  // AIモードがONかどうかを管理する状態
  const [isAiModeOn, setIsAiModeOn] = useState(false);
  // AIからの提案を保持する状態
  // { key: 'ai_assist_1', text: '提案内容' } の形式で格納
  const [aiSuggestions, setAiSuggestions] = useState([null, null]); // 2つの提案を保持するため、初期値をnullで埋める
  // モーションが進行中かどうかを管理する状態
  const [isMoveInProgress, setIsMoveInProgress] = useState(false);
  // 翻訳されたテキストを保持する状態を追加
  const [translatedText, setTranslatedText] = useState("");
  // 🌟追加: 音声認識が実行中かどうかを管理する状態
  const [isListening, setIsListening] = useState(false);
  // 🌟追加: SpeechRecognitionオブジェクトの参照を保持
  const recognition = useRef(null);

  const URL = "https://translation.googleapis.com/language/translate/v2?key=";
  const apiKey = 'AIzaSyBBk7P0P0XCyh3p0Ov7jiP9d1n02wYk_AY';
  // メッセージとモーションの多言語マッピング
  const messages = useMemo(() => ({
    hello: {
      japanese: 'リセット',
      english: 'Hello'
    },
    goodbye: {
      japanese: '決めポーズ',
      english: 'Goodbye'
    },
    bow: {
      japanese: 'バイバイ',
      english: 'Bow'
    },
    flap: {
      japanese: 'YES',
      english: 'Flap'
    },
    lookUp: {
      japanese: 'NO',
      english: 'Look up'
    },
    lookDown: {
      japanese: '右手を上げる',
      english: 'Look down'
    },
    lookRight: {
      japanese: '右手を下げる',
      english: 'Look right'
    },
    lookLeft: {
      japanese: '左手を上げる',
      english: 'Left hand up' // Changed from 'Look left' for clarity
    },
    nod: {
      japanese: '左手を下げる',
      english: 'Left hand down' // Changed from 'Nod' for clarity
    },
    tiltHead: {
      japanese: '上を向く',
      english: 'Look up' // Changed from 'Tilt head' for clarity
    },
    spin: {
      japanese: '下を向く',
      english: 'Look down' // Changed from 'Spin' for clarity
    },
    jump: {
      japanese: '右を向く',
      english: 'Look right' // Changed from 'Jump' for clarity
    },
    dance: {
      japanese: '左を向く',
      english: 'Look left' // Changed from 'Dance' for clarity
    },
    bowDeep: {
      japanese: 'パタパタ',
      english: 'Flap arms' // Changed from 'Deep bow' for clarity
    },
    doingSomething: {
      japanese: 'こんにちは',
      english: 'Hello'
    },
    thankYou: {
      japanese: 'バイバイ',
      english: 'Goodbye' // Changed from 'Thank you' for clarity
    },
    good: {
      japanese: 'ようこそ',
      english: 'Welcome' // Changed from 'Good' for clarity
    },
    ookini: {
      japanese: 'ありがとう',
      english: 'Thank you (Kansai dialect)'
    },
    amazing: {
      japanese: '楽しんでね',
      english: 'Enjoy' // Changed from 'Amazing' for clarity
    }
  }), []);


  /**
   * ログアウトボタンクリック時のハンドラ
   */
  const handleLogout = () => {
    setIsLoggedIn(false); // ログイン状態をfalseに設定
  };

  // SkyWay App ID と Secret Key
  // 注意: 本番環境では、これらのキーをクライアントサイドにハードコードせず、
  // サーバーサイドでトークンを生成してクライアントに安全に渡すことを強く推奨します。
  const appId = useMemo(() => "4490dcb5-dbe8-4028-ba0a-6d0d143e4515", []);
  const secretKey = useMemo(() => "40HHGEIOx0BRByPdxqwUswK0a+7v2JaeaJ9CcFjMdAQ=", []);

  // SkyWay認証トークンの生成
  const token = useMemo(() => {
    if (appId == null || secretKey == null) return undefined;

    return new SkyWayAuthToken({
      jti: uuidV4(), // JWT ID
      iat: nowInSec(), // 発行時刻
      exp: nowInSec() + 60 * 60 * 24, // 有効期限 (24時間)
      version: 3,
      scope: {
        appId: appId,
        rooms: [
          {
            name: "*", // すべてのルーム名に適用
            methods: ["create", "close", "updateMetadata"], // ルーム操作の権限
            member: {
              name: "*", // すべてのメンバーに適用
              methods: ["publish", "subscribe", "updateMetadata"] // メンバー操作の権限
            }
          }],
        turn: {
          enabled: true // TURNサーバーの使用を許可 (NAT越えのため)
        }
      }
    }).encode(secretKey);

  }, [appId, secretKey]);

  /**
   * SkyWayContextの初期化とクリーンアップを行うuseEffect
   * トークンが利用可能になったときに一度だけ実行されます。
   */
  useEffect(() => {
    if (!token) return;

    let currentContext;
    const initContext = async () => {
      try {
        currentContext = await SkyWayContext.Create(token);
        setSkywayContext(currentContext);
        console.log("SkyWayContext created successfully.");
      } catch (error) {
        console.error("Failed to create SkyWayContext:", error);
      }
    };

    initContext();

    // コンポーネントのアンマウント時にコンテキストを破棄
    return () => {
      if (currentContext) {
        currentContext.dispose();
        console.log("SkyWayContext disposed.");
      }
    };
  }, [token]); // tokenが変更されたときにのみ実行

  // 🌟追加: SpeechRecognition APIの初期化
  useEffect(() => {
    // ブラウザがSpeechRecognitionに対応しているか確認
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("SpeechRecognition API is not supported by this browser.");
      return;
    }

    // SpeechRecognitionオブジェクトを初期化
    recognition.current = new SpeechRecognition();
    recognition.current.continuous = true; // 連続的な認識
    recognition.current.interimResults = true; // 中間結果を返す
    recognition.current.lang = 'ja-JP'; // 日本語を指定

    // 音声認識の結果を処理するハンドラ
    recognition.current.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript = event.results[i][0].transcript;
          break; // 最初の確定した結果のみを取得
        }
      }

      // 確定した結果が空でなければSkywayで送信
      if (finalTranscript.trim() !== '') {
        console.log("Transcription final result:", finalTranscript);
        // Skywayのデータストリームで送信
        if (localDataStreamRef.current && me) {
          //const result = `translate_data_web:${finalTranscript}`; 
          const URL2 = URL + apiKey + "&q="+encodeURI(finalTranscript)+"&source="+'ja'+"&target="+'en';  // eslint-disable-line
          let xhr = new XMLHttpRequest()
          xhr.open('POST', [URL2], false)
          xhr.send();
          if (xhr.status === 200) {
            const res = JSON.parse(xhr.responseText); 
            const res2 = res["data"]["translations"][0]["translatedText"]
            const res3 =`translate_data_web:${res2}`;
            localDataStreamRef.current.write(res3);
          }

          console.log(`Sent transcription: "${finalTranscript}"`);
          // 自分の画面にも表示
          setReceivedMessages(prevMessages => [...prevMessages, { senderId: me.id, message: finalTranscript, isLocal: true }]);
        }
      }
    };

    // 認識エラー時のハンドラ
    recognition.current.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false); // エラー時はリスニング状態を停止
    };

    // 認識終了時のハンドラ
    recognition.current.onend = () => {
      console.log("Speech recognition ended.");
      // 連続認識モードでは、自動的に再起動されるため、特別な処理は不要
      // if (isListening) {
      //   recognition.current.start();
      // }
    };

    // コンポーネントのアンマウント時にイベントリスナーをクリーンアップ
    return () => {
      if (recognition.current) {
        recognition.current.stop();
      }
    };
  }, [me, localDataStreamRef]);

  /**
   * リモートストリームをDOMに追加するヘルパー関数
   * @param {RemoteVideoStream | RemoteAudioStream} stream - 追加するメディアストリーム
   * @param {string} memberId - ストリームのパブリッシャーのメンバーID
   */
  const attachRemoteStream = (stream, memberId) => {
    if (robotDisplayRef.current && (stream instanceof RemoteVideoStream || stream instanceof RemoteAudioStream)) {
      // 既存のビデオ要素があれば削除
      const existingVideo = remoteVideoElements.current.get(memberId);
      if (existingVideo) {
        robotDisplayRef.current.removeChild(existingVideo);
        remoteVideoElements.current.delete(memberId);
      }

      const video = document.createElement("video");
      video.autoplay = true; // 自動再生
      video.playsInline = true; // インライン再生 (iOSなどで必要)
      video.className = "remote-video object-cover"; // スタイリング用のクラスとobject-coverを追加
      video.dataset.memberId = memberId; // メンバーIDをデータ属性に保存
      stream.attach(video); // ストリームをビデオ要素のソースに設定
      robotDisplayRef.current.appendChild(video);
      remoteVideoElements.current.set(memberId, video);
      console.log(`Attached stream from ${memberId} to DOM.`);
    } else {
      console.warn(`Attempted to attach non-media stream or robotDisplayRef is null for member ${memberId}.`);
    }
  };

  /**
   * データストリームの受信を処理するヘルパー関数
   * @param {RemoteDataStream} stream - 受信するデータストリーム
   * @param {string} memberId - ストリームのパブリッシャーのメンバーID
   */
  const handleDataStream = (stream, memberId) => {
    if (stream instanceof RemoteDataStream) {
      stream.onData.add((data) => {
        console.log(`Received data from ${memberId}:`, data);
        // 受信したメッセージを状態に追加
        setReceivedMessages(prevMessages => [...prevMessages, { senderId: memberId, message: data }]);

        // "move_finish" シグナルをチェック
        if (data === "move_finish") {
          console.log("Received 'move_finish' signal. Enabling side panel buttons.");
          setIsMoveInProgress(false); // モーション終了
        }

        // AI提案のフォーマットをチェック
        // 新しいフォーマット "ai_assist_1:data:ai_assist_2:data" を解析
        const aiCombinedSuggestionRegex = /^ai_assist_1:(.*):ai_assist_2:(.*)$/;
        const combinedMatch = String(data).match(aiCombinedSuggestionRegex);

        if (combinedMatch) {
          const suggestion1Content = combinedMatch[1]; // キャプチャグループ1が最初の提案
          const suggestion2Content = combinedMatch[2]; // キャプチャグループ2が2番目の提案
          console.log(suggestion1Content);
          console.log(suggestion2Content);

          setAiSuggestions([
            { key: 'ai_assist_1', text: suggestion1Content }, // キーをai_assist_1に修正
            { key: 'ai_assist_2', text: suggestion2Content }  // キーをai_assist_2に修正
          ]);
          console.log("Received combined AI suggestions.");
        } else {
          // 以前の単一提案フォーマットも考慮する場合（もし両方のフォーマットが混在する可能性があるなら）
          const aiSingleSuggestionRegex = /^ai_assist_(\d+):(.*)$/;
          const singleMatch = String(data).match(aiSingleSuggestionRegex);

          if (singleMatch) {
            const suggestionNumber = parseInt(singleMatch[1], 10);
            const suggestionContent = singleMatch[2];

            if (suggestionNumber === 1 || suggestionNumber === 2) {
              setAiSuggestions(prevSuggestions => {
                const newSuggestions = [...prevSuggestions];
                newSuggestions[suggestionNumber - 1] = {
                  key: `ai_assist_${suggestionNumber}`, // キーをai_assist_Nに修正
                  text: suggestionContent
                };
                return newSuggestions;
              });
              console.log(`Received single AI suggestion ${suggestionNumber}.`);
            }
          }
        }

        // 新しい翻訳フォーマットをチェック
        const translateRegex = /^translate_request:(.*)$/;
        const translateMatch = String(data).match(translateRegex);

        if (translateMatch) {
          const translatedContent = translateMatch[1];
          setTranslatedText(translatedContent); // 状態を更新
          console.log(`Received translated text: ${translatedContent}`);
        } else {
          // 翻訳データではない場合、翻訳テキストをクリアするかは要検討
          // setTranslatedText("");
        }
      });
      console.log(`Listening for data from ${memberId}.`);
    } else {
      console.warn(`Attempted to handle non-data stream as data stream for member ${memberId}.`);
    }
  };

  /**
   * ルームに参加するハンドラ
   * SkyWayContextが初期化され、ルーム名が入力されている場合に実行されます。
   */
  const handleJoinRoom = async () => {
    if (!skywayContext) {
      console.error("SkyWayContext is not initialized. Please wait or check token.");
      return;
    }
    if (!roomName) {
      console.error("Room name is empty. Please enter a room name to join.");
      return;
    }
    if (skywayRoom && me) {
      console.warn("Already in a room. Please leave the current room first.");
      return;
    }

    try {
      // 指定されたルーム名でP2Pルームを作成または検索
      const room = await SkyWayRoom.FindOrCreate(skywayContext, {
        type: "p2p", // P2Pルームタイプ
        name: roomName,
      });

      // roomオブジェクトが有効であることを確認
      if (!room) {
        console.error("SkyWayRoom.FindOrCreate returned null or undefined room.");
        throw new Error("Failed to create or find SkyWayRoom.");
      }

      setSkywayRoom(room);
      console.log(`SkyWayRoom '${roomName}' found or created.`);

      // ルームに参加し、自分のメンバー情報を取得
      const localMember = await room.join();
      // localMemberが有効であることを確認
      if (!localMember) {
        console.error("room.join() returned null or undefined localMember.");
        throw new Error("Failed to join the room.");
      }
      setMe(localMember);
      console.log(`Joined room '${roomName}' as member ID: ${localMember.id}`);
      // ルームIDと自分のIDをコンソールに表示
      console.log(`Room ID: ${roomName} / My ID: ${localMember.id}`);


      // 自分のカメラとマイクのストリームを作成し、公開
      const { audio, video } = await SkyWayStreamFactory.createMicrophoneAudioAndCameraStream();
      localStreamRef.current = video; // ローカルビデオストリームを保存
      await localMember.publish(video);
      const publication_audio = await localMember.publish(audio);
      audioPublicationRef.current = publication_audio; // オーディオPublicationを保存
      setIsMuted(false);
      console.log("Published local camera and microphone stream.");

      // 自分のデータストリームを作成し、公開
      const dataStream = await SkyWayStreamFactory.createDataStream();
      localDataStreamRef.current = dataStream; // ローカルデータストリームを保存
      await localMember.publish(dataStream);
      console.log("Published local data stream.");

      // ルーム参加時はボタンを有効にする（モーションはまだ始まっていないため）
      setIsMoveInProgress(false);


      // --- 既存のストリームを購読するロジック ---
      // ルーム内の既存の公開ストリームをすべて購読する
      for (const publication of room.publications) {
        // 自分のストリームは購読しない
        if (localMember.id === publication.publisher.id) {
          continue;
        }
        try {
          const { stream } = await localMember.subscribe(publication.id);
          console.log(`Subscribed to existing stream from ${publication.publisher.id}, type: ${publication.contentType}`);

          if (publication.contentType === 'video' || publication.contentType === 'audio') {
            attachRemoteStream(stream, publication.publisher.id);
          } else if (publication.contentType === 'data') {
            handleDataStream(stream, publication.publisher.id);
          } else {
            console.warn(`Unknown stream content type: ${publication.contentType} from ${publication.publisher.id}`);
          }
        } catch (subscribeError) {
          console.error(`Failed to subscribe to existing stream from ${publication.publisher.id}:`, subscribeError);
        }
      }

      // --- ルームイベントリスナーの設定 ---

      // メンバーがルームに参加したときのイベント
      if (room.onMemberJoined) {
        room.onMemberJoined.add((e) => {
          console.log(`Member joined: ${e.member.id}`);
        });
      } else {
        console.error("room.onMemberJoined is undefined. This is unexpected.");
      }

      // メンバーがルームを離脱したときのイベント
      if (room.onMemberLeft) {
        room.onMemberLeft.add((e) => {
          console.log(`Member left: ${e.member.id}`);
          // 該当メンバーのビデオ要素をDOMから削除し、Mapからも削除
          const videoElement = remoteVideoElements.current.get(e.member.id);
          if (videoElement && robotDisplayRef.current) {
            robotDisplayRef.current.removeChild(videoElement);
            remoteVideoElements.current.delete(e.member.id);
            console.log(`Removed video for member ${e.member.id}`);
          }
          // データストリーム関連のクリーンアップもここに追加可能ですが、
          // onDataリスナーはストリームが閉じられると自動的に停止します。
        });
      } else {
        console.error("room.onMemberLeft is undefined. This is unexpected.");
      }

      // ストリームが公開されたときのイベント
      if (room.onStreamPublished) {
        room.onStreamPublished.add(async (e) => {
          console.log(`Stream published by ${e.publication.publisher.id}, type: ${e.publication.contentType}`);
          // 自分のストリームは購読しない
          if (localMember.id !== e.publication.publisher.id) {
            try {
              // リモートストリームを購読
              const { stream } = await localMember.subscribe(e.publication.id);
              console.log(`Subscribed to stream from ${e.publication.publisher.id}`);

              if (e.publication.contentType === 'video' || e.publication.contentType === 'audio') {
                attachRemoteStream(stream, e.publication.publisher.id);
              } else if (e.publication.contentType === 'data') {
                handleDataStream(stream, e.publication.publisher.id);
              } else {
                console.warn(`Unknown stream content type: ${e.publication.contentType} from ${e.publication.publisher.id}`);
              }
            } catch (subscribeError) {
              console.error(`Failed to subscribe to stream from ${e.publication.publisher.id}:`, subscribeError);
            }
          } else {
            console.log(`Skipping subscription for own stream: ${e.publication.publisher.id}`);
          }
        });
      } else {
        console.error("room.onStreamPublished is undefined. This is unexpected.");
      }

      // ストリームが非公開になったときのイベント
      if (room.onStreamUnpublished) {
        room.onStreamUnpublished.add((e) => {
          console.log(`Stream unpublished by ${e.publication.publisher.id}`);
          // 該当ストリームのビデオ要素をDOMから削除し、Mapからも削除
          const videoElement = remoteVideoElements.current.get(e.publication.publisher.id);
          if (videoElement && robotDisplayRef.current) {
            robotDisplayRef.current.removeChild(videoElement);
            remoteVideoElements.current.delete(e.publication.publisher.id);
            console.log(`Removed unpublished video for member ${e.publication.publisher.id}`);
          }
        });
      } else {
        console.error("room.onStreamUnpublished is undefined. This is unexpected.");
      }

    } catch (error) {
      console.error("Failed to join room:", error);
      // エラー発生時に状態をリセットして再試行可能にする
      setSkywayRoom(null);
      setMe(null);
      // エラー時に既存のビデオ要素をクリーンアップ
      if (robotDisplayRef.current) {
        Array.from(robotDisplayRef.current.children).forEach(child => {
          if (child.tagName === 'VIDEO') {
            // ビデオ要素のsrcObjectをクリアし、トラックを停止
            if (child.srcObject && typeof child.srcObject.getTracks === 'function') {
              child.srcObject.getTracks().forEach(track => track.stop());
              child.srcObject = null;
            }
            child.remove(); // DOMから要素を削除
          }
        });
      }
      remoteVideoElements.current.clear();
      if (localStreamRef.current) {
        // LocalVideoStreamのstop()メソッドを呼び出す
        if (typeof localStreamRef.current.stop === 'function') {
          localStreamRef.current.stop();
          console.log("Stopped local media stream during join error cleanup.");
        } else {
          console.warn("localStreamRef.current is not a valid LocalVideoStream or stop is not a function during join error cleanup.");
        }
        localStreamRef.current = null;
      }
      // LocalDataStreamは自動的にクリーンアップされるため、明示的なclose()は不要
      localDataStreamRef.current = null; // 参照をクリア
      console.log("Local data stream reference cleared during join error cleanup.");

      // ミュート状態もリセット
      setIsMuted(false);
      audioPublicationRef.current = null;
      setIsMoveInProgress(false); // エラー時もモーション状態をリセット
      setTranslatedText(""); // 翻訳テキストをクリア
    }
  };

  /**
   * ルームから退出するハンドラ
   */
  const handleLeaveRoom = async () => {
    if (skywayRoom && me) {
      try {
        // ローカルストリームを停止し、公開を解除
        if (localStreamRef.current) {
          // LocalVideoStreamのstop()メソッドを呼び出す
          if (typeof localStreamRef.current.stop === 'function') {
            localStreamRef.current.stop();
            console.log("Stopped local media stream.");
          } else {
            console.warn("localStreamRef.current is not a valid LocalVideoStream or stop is not a function during leave.");
          }
          localStreamRef.current = null;
        }
        // LocalDataStreamは自動的にクリーンアップされるため、明示的なclose()は不要
        localDataStreamRef.current = null; // 参照をクリア
        console.log("Local data stream reference cleared.");

        // オーディオPublicationの参照をクリア
        audioPublicationRef.current = null;
        setIsMuted(false); // ミュート状態をリセット
        setTranslatedText(""); // 翻訳テキストをクリア
        // �追加: ルーム退出時に音声認識を停止
        if (isListening) {
          recognition.current.stop();
          setIsListening(false);
        }

        await me.leave(); // ルームから退出
        console.log(`Left room '${roomName}'`);
        // ルーム退出をコンソールに表示
        console.log(`Left room: ${roomName}`);


        // room.dispose()を使用
        if (skywayRoom) {
          await skywayRoom.dispose(); // ルームを閉じる (これはルームの作成者のみが効果的です)
          console.log("SkyWay Room disposed.");
        }
        // SkyWay SDKに関するすべての操作が不要になった場合にcontext.dispose()を呼び出す
        // このコンポーネントがアンマウントされる際にuseEffectのクリーンアップ関数で処理されるため、ここでは呼び出さない

      } catch (error) {
      } finally {
        // 状態をリセット
        setMe(null);
        setSkywayRoom(null);
        setReceivedMessages([]); // 受信メッセージもクリア
        // すべてのリモートビデオ要素をDOMから削除
        if (robotDisplayRef.current) {
          Array.from(robotDisplayRef.current.children).forEach(child => {
            if (child.tagName === 'VIDEO') {
              // ビデオ要素のsrcObjectをクリアし、トラックを停止
              if (child.srcObject && typeof child.srcObject.getTracks === 'function') {
                child.srcObject.getTracks().forEach(track => track.stop());
                child.srcObject = null;
              }
              child.remove(); // DOMから要素を削除
            }
          });
        }
        remoteVideoElements.current.clear();
        // AIモードもオフにする
        setIsAiModeOn(false);
        setAiSuggestions([null, null]); // 提案もクリア
        setIsMoveInProgress(false); // ルーム退出時もモーション状態をリセット
      }
    }
  };

  /**
   * モーションを操作するボタンを押した時の処理
   * @param {string | object} messageOrKey - 送信するメッセージのキー (messagesオブジェクトのキー) またはAI提案オブジェクト
   */
  const handleSend = async (messageOrKey) => {
    if (me && skywayRoom && localDataStreamRef.current) {
      try {
        let messageToSend;
        let shouldSetMoveInProgress = false; // モーション進行中フラグを制御するための新しい変数

        if (typeof messageOrKey === 'string') {
          // サイドボタンからの送信の場合、直接メッセージ文字列を使用
          if (messageOrKey.startsWith("template_motion_")) {
            messageToSend = messageOrKey;
            shouldSetMoveInProgress = true; // モーションコマンドの場合のみフラグを立てる
          } else if (messageOrKey.startsWith("template_voice_")) {
            messageToSend = messageOrKey;
            // ボイスコマンドの場合はshouldSetMoveInProgressをtrueにしない
          } else if (messageOrKey.startsWith("robot_reset")){
            messageToSend = messageOrKey;
          } else {
            // 既存のmessagesオブジェクトからのルックアップ (AI提案以外でキーが渡された場合など)
            messageToSend = messages[messageOrKey];
          }
        } else if (typeof messageOrKey === 'object' && messageOrKey.key) { // messageOrKey.text から messageOrKey.key に変更
          // AI提案ボタンからの送信
          messageToSend = messageOrKey.key; // 提案のキー（ai_assist_1など）を送信
          // AI提案の場合はshouldSetMoveInProgressをtrueにしない
        }

        if (!messageToSend) {
          console.warn(`Message to send is empty or not found.`);
          return;
        }

        localDataStreamRef.current.write(messageToSend);
        console.log(`Sent message: "${messageToSend}"`);
        // 送信したメッセージも自身の画面に表示
        setReceivedMessages(prevMessages => [...prevMessages, { senderId: me.id, message: messageToSend, isLocal: true }]);
        setAiSuggestions([null, null]); // 送信したら提案をクリア

        // shouldSetMoveInProgressがtrueの場合のみモーション進行中状態にする
        if (shouldSetMoveInProgress) {
          setIsMoveInProgress(true);
        }
        // AI提案やボイスコマンドの場合は、isMoveInProgressは変更しない
        // (以前のモーションが進行中であればそのまま、そうでなければfalseのまま)

      } catch (error) {
        console.error("Failed to send data:", error);
      }
    } else {
      console.warn("Cannot send message: Not in a room, 'me' object is not available, or data stream is not ready.");
    }
  };

  /**
   * マイクのミュート/ミュート解除を切り替えるハンドラ
   */
  const handleMute = async () => {
    console.log("start");
    if (!audioPublicationRef.current) {
      console.warn("Audio publication not available. Cannot toggle mute.");
      return;
    }

    try {
      if (isMuted) {
        // 現在ミュート状態なら、ミュートを解除
        await audioPublicationRef.current.enable();
        console.log("Microphone unmuted.");
      } else {
        // 現在ミュート状態でないなら、ミュート
        await audioPublicationRef.current.disable();
        console.log("Microphone muted.");
      }
      setIsMuted(!isMuted); // ミュート状態をトグル
    } catch (error) {
      console.error("Failed to toggle microphone mute state:", error);
    }
  };

  // AIモードが変更されたときにシグナルを送信するためのフラグ
  const isInitialAiModeRender = useRef(true);

  /**
   * AIモードの状態変更を監視し、シグナルを送信するuseEffect
   */
  useEffect(() => {
    // 初回レンダリング時はシグナルを送信しない
    if (isInitialAiModeRender.current) {
      isInitialAiModeRender.current = false;
      return;
    }

    // me オブジェクトとデータストリームが利用可能であることを確認
    if (!me || !localDataStreamRef.current) {
      return;
    }

    if (isAiModeOn) {
      // AIモードがONになったら、AIに提案を要求するメッセージを送信
      localDataStreamRef.current.write("robot_reset");
      console.log("Sent AI_MODE_REQUEST_SUGGESTIONS signal.");
      setAiSuggestions([null, null]); // 新しいセッションのために提案をクリア
    } else {
      // AIモードがOFFになったら提案をクリアし、AIモード終了のシグナルを送信
      localDataStreamRef.current.write("robot_reset");
      console.log("Sent AI_MODE_OFF_SIGNAL.");
      setAiSuggestions([null, null]); // 提案をクリア
    }
  }, [isAiModeOn, me, localDataStreamRef]); // isAiModeOn, me, localDataStreamRef の変更に反応

  /**
   * AIモードを切り替えるハンドラ
   * この関数はAIモードの状態をトグルするのみで、シグナル送信はuseEffectに任せる
   */
  /* eslint-disable */
  const handleAiModeToggle = () => {
    setIsAiModeOn(prev => !prev);
  };
  /* eslint-enable */

  // 🌟追加: 音声認識の開始・停止を切り替えるハンドラ
  const handleToggleListening = () => {
    if (!recognition.current) {
      console.error("SpeechRecognition API is not initialized.");
      return;
    }

    if (isListening) {
      // 認識を停止
      recognition.current.stop();
      console.log("Stopped speech recognition.");
    } else {
      // 認識を開始
      recognition.current.start();
      console.log("Started speech recognition.");
    }
    setIsListening(!isListening);
  };

  return (
    <div className="app-container">
      <div className="header">
      
        <div className="header-left">
          <button className="motion-btn" disabled={isAiModeOn || isMoveInProgress}>モーション</button>
          {/* 翻訳されたテキストを表示する要素を追加 */}
          {translatedText && (
            <div className="translated-text">
              <span className="translated-text-label">翻訳: </span>
              <span className="translated-text-content">{translatedText}</span>
            </div>
          )}
        </div>
        <div className="header-right">
          <button onClick={handleLogout} className="logout-btn">ログアウト</button>
          <button className="voice-btn" disabled={isAiModeOn || isMoveInProgress}>ボイス</button>
        </div>
      </div>
      <div className="main-container">
        <div className="side-panel">
          <div className="side-panel-content">
            {Object.keys(messages).slice(0, 14).map(key => ( // 左側のボタン数を調整
              <button
                key={key}
                // 左側のボタンは "template_motion_〇〇" 形式で送信
                onClick={() => handleSend(`template_motion_${messages[key].japanese}`)}
                className="side-btn"
                disabled={isAiModeOn || !me || isMoveInProgress} // AIモード中、未参加、モーション中は無効化
              >
                {messages[key].japanese} {/* 常に日本語表示 */}
              </button>
            ))}
          </div>
        </div>
        <div className="main-area">
          <div className="room-controls">
            <input
              type="text"
              placeholder="ルーム名を入力"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="room-input"
              disabled={!!me} // ルーム参加中は入力不可にする
            />
            {!me ? ( // ルームに参加していない場合
              <button onClick={handleJoinRoom} className="join-room-btn" disabled={!skywayContext || !roomName}>
                ルームに参加
              </button>
            ) : ( // ルームに参加している場合
              <button onClick={handleLeaveRoom} className="leave-room-btn">
                ルームを退出
              </button>
            )}
          </div>
          <div className="robot-display" ref={robotDisplayRef}>
            {/* リモートのビデオストリームがここに動的に追加されます */}
            {/* ルーム情報はコンソールに表示されるため、ここでは表示しません */}

            {/* AIからの提案表示 */}
            {(aiSuggestions[0] || aiSuggestions[1]) && (
              <div className="ai-suggestions">
                {aiSuggestions[0] && (
                  <button
                    onClick={() => handleSend(aiSuggestions[0])}
                    className="ai-suggestion-btn"
                    disabled={isMoveInProgress} // モーション中は無効化
                  >
                    {aiSuggestions[0].text}
                  </button>
                )}
                {aiSuggestions[1] && (
                  <button
                    onClick={() => handleSend(aiSuggestions[1])}
                    className="ai-suggestion-btn"
                    disabled={isMoveInProgress} // モーション中は無効化
                  >
                    {aiSuggestions[1].text}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="side-panel right">
          <div className="side-panel-content">
            {Object.keys(messages).slice(14).map(key => ( // 右側のボタン数を調整
              <button
                key={key}
                // 右側のボタンは "template_voice_〇〇" 形式で送信
                onClick={() => handleSend(`template_voice_${messages[key].japanese}`)}
                className="side-btn"
                disabled={isAiModeOn || !me || isMoveInProgress} // AIモード中、未参加、モーション中は無効化
              >
                {messages[key].japanese} {/* 常に日本語表示 */}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="bottom-controls">
        <button
          className={`control-btn ai-btn`}
          onClick={() => handleAiModeToggle()}
          disabled={!me} // ルームに参加していない場合は無効
        >
          {isAiModeOn ? 'リセット   ' : 'AIモードON'}
        </button>
        {/* 🌟追加: 音声認識ボタン */}
        <button
          className={`control-btn speech-recognition-btn ${isListening ? 'listening' : ''}`}
          onClick={handleToggleListening}
          disabled={!me || !localDataStreamRef.current || isAiModeOn} // ルーム未参加、データストリーム未準備、AIモード中は無効
        >
          {isListening ? '🔴 音声認識を停止' : '🎤 音声認識を開始'}
        </button>
        <button
          className={`control-btn mic-btn ${isMuted ? 'muted' : ''}`} // ミュート状態に応じてクラスを追加
          onClick={handleMute}
          id="micBtn"
          disabled={!me || !audioPublicationRef.current || isAiModeOn} // ルームに参加していない、またはオーディオが公開されていない、AIモード中は無効
        >
          {isMuted ? '🔇 マイクミュート' : '🎤 マイクON'} {/* ミュート状態に応じてアイコンとテキストを変更 */}
        </button>
      </div>
    </div>
  );
}

export default Home;
