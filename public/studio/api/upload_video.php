<?php
/**
 * public/studio/api/upload_video.php
 * 
 * mdo3 Studio 完成動画アップロード ＆ Google Drive メタデータ連携 API
 * - モード1: Google Drive URL 登録 (サーバー負荷完全ゼロ仕様)
 * - モード2: ローカル動画ファイル直接アップロード (mp4 / mov / webm)
 * - メタデータ（タイトル、尺、Google Drive URL、対象ツール等）を JSON に記録
 */

header('Content-Type: application/json; charset=UTF-8');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

$uploadDir = __DIR__ . '/../uploads/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

$metadataFile = $uploadDir . 'videos_meta.json';
$videosMeta = file_exists($metadataFile) ? json_decode(file_get_contents($metadataFile), true) : [];
if (!is_array($videosMeta)) $videosMeta = [];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // 動画一覧の返却
    echo json_encode([
        'success' => true,
        'videos'  => array_values($videosMeta)
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // モード1: Google Drive URL または 外部ストリーミング URL の直接登録 (サーバー負荷ゼロ)
    if (!empty($_POST['url']) || !empty($_POST['gdrive_url'])) {
        $videoUrl = trim($_POST['url'] ?? $_POST['gdrive_url']);
        $uniqueId = 'vid_gdrive_' . date('Ymd_His') . '_' . bin2hex(random_bytes(3));
        
        $videoItem = [
            'id'          => $uniqueId,
            'source'      => 'google_drive',
            'file_name'   => 'Google Drive Hosted',
            'url'         => $videoUrl,
            'title'       => $_POST['title'] ?? 'mdo3 Google Drive 完成動画',
            'tool_id'     => $_POST['tool_id'] ?? 'general',
            'tool_name'   => $_POST['tool_name'] ?? 'mdo3 専門ツール',
            'duration'    => intval($_POST['duration'] ?? 30),
            'purpose'     => $_POST['purpose'] ?? 'promo',
            'size_bytes'  => 0, // サーバー負荷ゼロ
            'created_at'  => date('Y-m-d H:i:s')
        ];

        array_unshift($videosMeta, $videoItem);
        file_put_contents($metadataFile, json_encode($videosMeta, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        echo json_encode([
            'success' => true,
            'message' => 'Google Drive 動画のメタデータを正常に登録しました (サーバー負荷ゼロ)',
            'video'   => $videoItem
        ]);
        exit;
    }

    // モード2: ローカル動画ファイルの直接アップロード
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
            'source'      => 'local_upload',
            'file_name'   => $fileName,
            'url'         => 'uploads/' . $fileName,
            'title'       => $_POST['title'] ?? '無題の動画プロジェクト',
            'tool_id'     => $_POST['tool_id'] ?? 'general',
            'tool_name'   => $_POST['tool_name'] ?? 'mdo3 構造ツール',
            'duration'    => intval($_POST['duration'] ?? 30),
            'purpose'     => $_POST['purpose'] ?? 'promo',
            'size_bytes'  => filesize($targetPath),
            'created_at'  => date('Y-m-d H:i:s')
        ];

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
