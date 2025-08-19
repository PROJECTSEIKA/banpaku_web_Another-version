import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';


/**
 * ログインフォームコンポーネント
 * @param {object} props - プロパティ
 * @param {function} props.setIsLoggedIn - ログイン状態を設定する関数
 */
function Login({ setIsLoggedIn }) {
  // ユーザー名とパスワードの状態を管理
  const [password, setPassword] = useState('');
  // 画面遷移のためのnavigateフック
  const navigate = useNavigate();

  /**
   * フォーム送信時のハンドラ
   * @param {object} e - イベントオブジェクト
   */
  const handleSubmit = (e) => {
    e.preventDefault(); // デフォルトのフォーム送信を防ぐ

    // ここで実際の認証ロジックを実装します
    // 例: ユーザー名が 'user' でパスワードが 'password' の場合に認証成功とみなす
    if ( password === 'password') {
      setIsLoggedIn(true); // ログイン状態をtrueに設定
      navigate('/home'); // ログイン成功後、/home へ遷移
    } else {
      // 認証失敗時のメッセージ表示（alertの代わりにカスタムモーダルを使用することを推奨）
      alert('パスワードが異なります。');
    }
  };

  

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">ログイン</h2>
        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
              パスワード:
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline w-full transition duration-300 ease-in-out"
          >
            ログイン
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;