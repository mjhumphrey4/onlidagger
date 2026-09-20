<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli')exit(1);
require dirname(__DIR__).'/app/bootstrap.php';
$dest=$argv[1]??'';
if(!$dest||file_exists($dest)){fwrite(STDERR,"Usage: php bin/backup.php /absolute/path/to/new-backup.sqlite\nDestination must not exist.\n");exit(1);}
// SQLite creates a consistent snapshot including committed WAL transactions.
db()->exec('VACUUM INTO '.db()->quote($dest));chmod($dest,0600);echo "Backup written: $dest\n";
