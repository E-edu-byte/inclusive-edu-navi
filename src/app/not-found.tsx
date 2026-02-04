import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container-main py-16">
      <div className="max-w-lg mx-auto text-center">
        <div className="mb-8">
          <span className="text-8xl font-bold text-primary-200">404</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          ページが見つかりません
        </h1>
        <p className="text-gray-600 mb-8">
          お探しのページは存在しないか、移動した可能性があります。
        </p>
        <Link
          href="/"
          className="btn-primary"
        >
          トップページに戻る
        </Link>
      </div>
    </div>
  );
}
