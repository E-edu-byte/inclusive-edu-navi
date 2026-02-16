'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// コメントの型定義
type Comment = {
  id: string;
  donor_name: string;
  content: string;
  created_at: string;
};

export default function CommentsPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDonorAuth, setIsDonorAuth] = useState(false);
  const [donorName, setDonorName] = useState('');
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');
  const [postSuccess, setPostSuccess] = useState(false);

  // 認証状態を確認
  useEffect(() => {
    const savedAuth = localStorage.getItem('donor_auth');
    if (savedAuth === 'true') {
      setIsDonorAuth(true);
    }
  }, []);

  // コメントを取得
  useEffect(() => {
    async function fetchComments() {
      try {
        const { data, error } = await supabase
          .from('comments')
          .select('*')
          .order('created_at', { ascending: false });

        if (data && !error) {
          setComments(data);
        }
      } catch (e) {
        console.error('コメント取得エラー:', e);
      } finally {
        setLoading(false);
      }
    }

    fetchComments();

    // Realtime購読
    const channel = supabase
      .channel('comments_all_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments' },
        (payload) => {
          setComments((prev) => [payload.new as Comment, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // コメント投稿
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setPostError('コメントを入力してください');
      return;
    }

    setPosting(true);
    setPostError('');

    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          donor_name: donorName.trim() || '匿名ユーザー',
          content: content.trim(),
        });

      if (error) {
        setPostError(`エラー: ${error.message}`);
      } else {
        setContent('');
        setPostSuccess(true);
        setTimeout(() => setPostSuccess(false), 3000);
      }
    } catch (e) {
      setPostError(`例外: ${e instanceof Error ? e.message : '不明なエラー'}`);
    } finally {
      setPosting(false);
    }
  };

  // 日時フォーマット
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="container-main py-8">
      {/* ヘッダー */}
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          トップに戻る
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          みんなのコメント
        </h1>
        <p className="text-gray-600 mt-1">
          {comments.length}件のコメント
        </p>
      </div>

      {/* コメント投稿フォーム or 案内 */}
      <div className="mb-8">
        {isDonorAuth ? (
          <form onSubmit={handleSubmit} className="bg-emerald-50 rounded-xl p-5 border border-emerald-200">
            <h2 className="text-sm font-bold text-emerald-800 mb-3">コメントを投稿</h2>
            <div className="mb-3">
              <label className="block text-sm text-gray-600 mb-1">ニックネーム（任意）</label>
              <input
                type="text"
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                placeholder="空欄の場合「匿名ユーザー」になります"
                maxLength={20}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500 bg-white"
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm text-gray-600 mb-1">コメント</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="サイトへの感想や、記事へのコメントをお書きください"
                rows={4}
                maxLength={500}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:border-emerald-500 bg-white"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{content.length}/500</p>
            </div>
            {postError && (
              <p className="text-sm text-red-500 mb-3">{postError}</p>
            )}
            <div className="flex items-center justify-between">
              {postSuccess && (
                <span className="text-sm text-emerald-600 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  投稿しました！
                </span>
              )}
              <button
                type="submit"
                disabled={posting || !content.trim()}
                className="ml-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {posting ? '投稿中...' : 'コメントを投稿'}
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-purple-50 rounded-xl p-5 border border-purple-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-700 font-medium">
                  コメント投稿は<span className="text-purple-600">OFUSEで寄付いただいた方</span>限定です
                </p>
                <a
                  href="https://ofuse.me/inclusive-navi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors"
                >
                  OFUSEで応援する
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* コメント一覧 */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="mt-3 text-gray-500">読み込み中...</p>
          </div>
        ) : comments.length > 0 ? (
          comments.map((comment) => (
            <div key={comment.id} className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-gray-800">{comment.donor_name}</span>
                <span className="text-xs text-gray-400">{formatDate(comment.created_at)}</span>
              </div>
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
            </div>
          ))
        ) : (
          <div className="text-center py-16 bg-gray-50 rounded-xl">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-gray-500">まだコメントはありません</p>
            <p className="text-gray-400 text-sm mt-1">最初のコメントを投稿してみませんか？</p>
          </div>
        )}
      </div>
    </div>
  );
}
