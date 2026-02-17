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
  likes: number;
};

// いいね済みコメントのlocalStorageキー
const LIKED_COMMENTS_KEY = 'liked_comments';

type CommentSectionProps = {
  isDonorAuth: boolean;
};

export default function CommentSection({ isDonorAuth }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [donorName, setDonorName] = useState('');
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');
  const [postSuccess, setPostSuccess] = useState(false);
  const [keyExpired, setKeyExpired] = useState(false);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());

  // いいね済みコメントをlocalStorageから読み込み
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LIKED_COMMENTS_KEY);
      if (saved) {
        setLikedComments(new Set(JSON.parse(saved)));
      }
    } catch (e) {
      console.error('いいね状態の読み込みエラー:', e);
    }
  }, []);

  // コメントを取得（最新3件のみ）
  useEffect(() => {
    async function fetchComments() {
      try {
        // 最新3件を取得
        const { data, error } = await supabase
          .from('comments')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(3);

        if (data && !error) {
          setComments(data);
        }

        // 総件数を取得
        const { count } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true });

        if (count !== null) {
          setTotalCount(count);
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
      .channel('comments_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments' },
        (payload) => {
          // 新しいコメントを先頭に追加し、3件に制限
          setComments((prev) => [payload.new as Comment, ...prev].slice(0, 3));
          setTotalCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 合言葉の有効性をチェック
  const checkKeyValidity = async (): Promise<boolean> => {
    try {
      const savedKey = localStorage.getItem('donor_auth_key');
      if (!savedKey) return false;

      const { data, error } = await supabase
        .from('access_keys')
        .select('key_string')
        .limit(1)
        .single();

      if (data && !error && data.key_string === savedKey) {
        return true;
      } else {
        // 合言葉が変更された
        localStorage.removeItem('donor_auth');
        localStorage.removeItem('donor_auth_key');
        setKeyExpired(true);
        return false;
      }
    } catch (e) {
      console.error('合言葉チェックエラー:', e);
      return false;
    }
  };

  // コメント投稿
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setPostError('コメントを入力してください');
      return;
    }

    // 投稿前に合言葉をチェック
    const isValid = await checkKeyValidity();
    if (!isValid) {
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

  // いいね処理
  const handleLike = async (commentId: string) => {
    // 既にいいね済みの場合は何もしない
    if (likedComments.has(commentId)) return;

    try {
      // 現在のいいね数を取得
      const { data: currentComment, error: fetchError } = await supabase
        .from('comments')
        .select('likes')
        .eq('id', commentId)
        .single();

      if (fetchError || !currentComment) return;

      const newLikes = (currentComment.likes || 0) + 1;

      // いいね数を更新
      const { error } = await supabase
        .from('comments')
        .update({ likes: newLikes })
        .eq('id', commentId);

      if (!error) {
        // ローカル状態を更新
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? { ...c, likes: newLikes } : c))
        );

        // いいね済みリストに追加
        const newLiked = new Set(likedComments);
        newLiked.add(commentId);
        setLikedComments(newLiked);
        localStorage.setItem(LIKED_COMMENTS_KEY, JSON.stringify([...newLiked]));
      }
    } catch (e) {
      console.error('いいねエラー:', e);
    }
  };

  // 日時フォーマット
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <section id="comments" className="scroll-mt-20">
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100 p-5 sm:p-6">
        <h2 className="text-lg font-bold text-emerald-800 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          みんなのコメント
          {totalCount > 0 && (
            <span className="text-sm font-normal text-emerald-600">（{totalCount}件）</span>
          )}
        </h2>

        {/* 合言葉が変更された場合の案内 */}
        {keyExpired && (
          <div className="mb-6 bg-amber-50 rounded-lg p-4 border border-amber-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm text-amber-800 font-medium">
                  合言葉が更新されました
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  最新のOFUSEメッセージから再認証してください
                </p>
              </div>
            </div>
          </div>
        )}

        {/* コメント投稿フォーム or 案内 */}
        {isDonorAuth && !keyExpired ? (
          <form onSubmit={handleSubmit} className="mb-6 bg-white rounded-lg p-4 border border-emerald-200">
            <div className="mb-3">
              <label className="block text-sm text-gray-600 mb-1">ニックネーム（任意）</label>
              <input
                type="text"
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                placeholder="空欄の場合「匿名ユーザー」になります"
                maxLength={20}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm text-gray-600 mb-1">コメント</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="サイトへの感想や、記事へのコメントをお書きください"
                rows={3}
                maxLength={500}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:border-emerald-500"
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
                className="ml-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {posting ? '投稿中...' : 'コメントを投稿'}
              </button>
            </div>
          </form>
        ) : !keyExpired && (
          <div className="mb-6 bg-white rounded-lg p-4 border border-emerald-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-700">
                  OFUSEで応援してコメントしよう。広告のないサイトの運営にご協力ください。
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

        {/* コメント一覧（最新3件） */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">読み込み中...</p>
            </div>
          ) : comments.length > 0 ? (
            <>
              {comments.map((comment) => (
                <div key={comment.id} className="bg-white rounded-lg p-4 border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-800 text-sm">{comment.donor_name}</span>
                    <span className="text-xs text-gray-400">{formatDate(comment.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                  {/* いいねボタン */}
                  <div className="mt-3 flex items-center">
                    <button
                      onClick={() => handleLike(comment.id)}
                      disabled={likedComments.has(comment.id)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        likedComments.has(comment.id)
                          ? 'bg-emerald-100 text-emerald-700 cursor-default'
                          : 'bg-gray-100 text-gray-600 hover:bg-emerald-50 hover:text-emerald-600'
                      }`}
                    >
                      <span>👍</span>
                      <span>{comment.likes || 0}</span>
                    </button>
                  </div>
                </div>
              ))}

              {/* すべてのコメントを見るボタン */}
              {totalCount > 3 && (
                <div className="pt-2">
                  <Link
                    href="/comments"
                    className="flex items-center justify-center gap-2 w-full py-3 bg-white hover:bg-gray-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm font-medium transition-colors"
                  >
                    すべてのコメントを見る（{totalCount}件）
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-gray-500 text-sm">まだコメントはありません</p>
              <p className="text-gray-400 text-xs mt-1">最初のコメントを投稿してみませんか？</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
