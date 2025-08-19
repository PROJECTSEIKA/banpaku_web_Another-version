import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './login.js'; // 正しいパスを確認
import Home from './home.js' ;   // 正しいパスを確認
import './App.css'; // Tailwind CSSを適用するために必要（後述）

/**
 * メインアプリケーションコンポーネント
 * ログイン状態とルーティングを管理
 */
function App() {
  // ログイン状態を管理するstate
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* ルートパス ("/") はログインコンポーネントを表示 */}
          <Route path="/" element={<Login setIsLoggedIn={setIsLoggedIn} />} />

          {/* "/home" パスはログイン状態に応じて表示を切り替える */}
          <Route
            path="/home"
            element={isLoggedIn ? <Home setIsLoggedIn={setIsLoggedIn} /> : <Navigate to="/" />}
          />

          {/* 未定義のパスに対するリダイレクト */}
          {/* どのパスにもマッチしない場合、ログインページにリダイレクトする */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;