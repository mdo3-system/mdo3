<?php
/**
 * public/studio/api/upload_video.php
 * 
 * mdo3 Studio 完成動画アップロード API
 * - mp4 / mov / webm の動画ファイルを受け付け
 * - uploads ディレクトリへ安全に保存
 * - メタデータ（タイトル、尺、対象ツール、解像度等）を JSON に記録
 */

header('Content-Type: application/json; charset=UTF-8');
header("Access-Control-Allow-Origin: *");

$uploadDir = __DIR__ . '/../uploads/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

$metadataFile = $uploadDir . 'videos_meta.json';
$videosMeta = file_exists($metadataFile) ? json_decode(file_get_contents($metadataFile), true) : [];
if (!is_array($videosMeta)) $videosMeta = [];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // アップロード済み動画一覧の返却
    echo json_encode([
        'success' => true,
        'videos'  => array_values($videosMeta)
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!isset($_FILES['video_file']) || $_FILES['video_file']['error'] !== UPLOAD_ERR_OK) {
        $errorCode = $_FILES['video_file']['error'] ?? 'no_file';
        echo json_encode([
            'success' => false,
            'message' => '動画ファイルのアップロードに失敗しました (Error: ' . $errorCode . ')'
        ]);
        exit;
    }

    $file = $_FILES['video_file'];
    $allowedTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

    if (!in_array($ext, ['mp4', 'mov', 'webm'])) {
        echo json_encode([
            'success' => false,
            'message' => '対応していないファイル形式です (.mp4, .mov, .webm のみ対応)'
        ]);
        exit;
    }

    $uniqueId = 'vid_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4));
    $fileName = $uniqueId . '.' . $ext;
    $targetPath = $uploadDir . $fileName;

    if (move_uploaded_file($file['tmp_name'], $targetPath)) {
        $videoItem = [
            'id'          => $uniqueId,
            'file_name'   => $fileName,
            'url'         => 'uploads/' . $fileName,
            'title'       => $_POST['title'] ?? '無題の動画プロジェクト',
            'tool_id'     => $_POST['tool_id'] ?? 'general',
            'tool_name'   => $_POST['tool_name'] ?? 'mdo3 構造ツール',
            'duration'    => intval($_POST['duration'] ?? 30),
            'purpose'     => $_POST['purpose'] ?? 'promo', // promo or howto
            'size_bytes'  => filesize($targetPath),
            'created_at'  => date('Y-m-d H:i:s')
        ];

        // メタデータ追加
        array_unshift($videosMeta, $videoItem);
        file_put_contents($metadataFile, json_encode($videosMeta, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        echo json_encode([
            'success' => true,
            'message' => '動画のアップロードが完了しました',
            'video'   => $videoItem
        ]);
        exit;
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'ファイルの保存に失敗しました。サーバーの容量または権限を確認してください。'
        ]);
        exit;
    }
}
