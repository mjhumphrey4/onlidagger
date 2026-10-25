<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli')exit(1);
require dirname(__DIR__).'/app/bootstrap.php';
maintenance();
$unknown=one("SELECT COUNT(*) n FROM commands WHERE status='unknown'")['n'];
$offline=one('SELECT COUNT(*) n FROM accounts WHERE enabled=1 AND (last_seen IS NULL OR last_seen<?)',[time()-15])['n'];
echo json_encode(['time'=>gmdate('c'),'unknown_commands'=>$unknown,'offline_accounts'=>$offline],JSON_PRETTY_PRINT).PHP_EOL;
