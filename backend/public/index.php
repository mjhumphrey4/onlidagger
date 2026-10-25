<?php
declare(strict_types=1);
require dirname(__DIR__).'/app/bootstrap.php';
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
header('Cache-Control: no-store');
$path=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);
try {
    if($path==='/api/ea/download' && $_SERVER['REQUEST_METHOD']==='GET') {
        $ea=dirname(__DIR__).'/mt5/ONLIDagger.mq5';
        if(!is_file($ea)) fail('Expert Advisor download is unavailable',404);
        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename="ONLIDagger.mq5"');
        header('Content-Length: '.filesize($ea));
        readfile($ea); exit;
    }
    if(str_starts_with($path,'/api/')) { require dirname(__DIR__).'/app/api.php'; exit; }
    http_response_code(404); header('Content-Type: application/json');
    echo json_encode(['error'=>'Not found']);
} catch(Throwable $e) {
    error_log((string)$e); json_response(['error'=>'Server error. Check the application log.'],500);
}
