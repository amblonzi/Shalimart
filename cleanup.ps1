$root = 'c:\Users\Tesla\Desktop\Inphora Workbench\Inphora Websites\Shalimart New'
$backend = Join-Path $root 'backend'
$frontend = Join-Path $root 'frontend'

# Backend junk files
$backendJunk = 'cpanel_check.py','connect_ssh.sh','ssh_pass.exp','ssh_connect.exp','su_root.exp','explore_server.sh','try_variations.sh','try_variations_2.sh','admin_wrapper.sh','deploy_wrapper.sh','update_admin.sh','diag_key.py','check_remote_ports.py','test_ssh.py','finalize_deployment.py','deploy_ssh.py','passenger_wsgi.py','extract.py','import_csv.py','verify_products.py','upload_favicon_sftp.py','backend.tar.gz','uploads.tar.gz'

foreach ($f in $backendJunk) {
    $path = Join-Path $backend $f
    if (Test-Path $path) {
        Remove-Item $path -Force
        Write-Host "Deleted: backend/$f"
    }
}

# Root junk files
$rootJunk = 'shalimart.tar.gz','shalimart.zip','shalimart_v1.zip','uploads.tar.gz','index.html','test_push.txt','extract_uploads.py','upload_images_wrapper.sh'

foreach ($f in $rootJunk) {
    $path = Join-Path $root $f
    if (Test-Path $path) {
        Remove-Item $path -Force
        Write-Host "Deleted: root/$f"
    }
}

# Root junk directories
$dirName1 = 'staging_upload'
$dirName2 = 'image upload'
$p1 = Join-Path $root $dirName1
$p2 = Join-Path $root $dirName2
if (Test-Path $p1) { Remove-Item $p1 -Recurse -Force; Write-Host "Deleted dir: staging_upload" }
if (Test-Path $p2) { Remove-Item $p2 -Recurse -Force; Write-Host "Deleted dir: image upload" }

# Frontend junk
$ftgz = Join-Path $frontend 'frontend.tar.gz'
if (Test-Path $ftgz) { Remove-Item $ftgz -Force; Write-Host "Deleted: frontend/frontend.tar.gz" }

# Backend __pycache__
$pycache = Join-Path $backend '__pycache__'
if (Test-Path $pycache) { Remove-Item $pycache -Recurse -Force; Write-Host "Deleted: backend/__pycache__" }

Write-Host "Cleanup complete!"
