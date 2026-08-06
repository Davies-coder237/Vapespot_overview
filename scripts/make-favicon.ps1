Add-Type -AssemblyName System.Drawing

$proj = 'C:\Users\Mitson informatique\Desktop\vapespot_work'
$src  = 'C:\Users\Mitson informatique\Desktop\lachlan\IMG_20260709_172540_103.jpg'

# Copie la photo dans le projet (source du favicon)
Copy-Item $src "$proj\public\images\IMG_20260709_172540_103.jpg" -Force

$img = [System.Drawing.Image]::FromFile($src)

function New-CircularFavicon([int]$size, [string]$out) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g   = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::Transparent)

    $srcRect = New-Object System.Drawing.Rectangle(0, 0, $img.Width, $img.Height)
    $dstRect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $g.DrawImage($img, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)

    # Masque circulaire : tout transparent sauf le cercle inscrit
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $rect  = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $circ  = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $path.AddRectangle($rect)
    $path.AddEllipse($circ)
    $g.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
    $g.FillPath([System.Drawing.Brushes]::Transparent, $path)
    $g.Dispose()

    $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
    $c = $bmp.GetPixel([int][Math]::Floor($size / 2), [int][Math]::Floor($size / 2))
    $e = $bmp.GetPixel(1, 1)
    $bmp.Dispose()
    Write-Output ("{0}: center-alpha={1} corner-alpha={2}" -f (Split-Path $out -Leaf), $c.A, $e.A)
}

New-CircularFavicon 256 "$proj\public\favicon.png"
New-CircularFavicon 32  "$proj\public\favicon-32.png"

# apple-touch-icon : plein carré 180x180 (iOS applique lui-même les coins arrondis)
$bmp = New-Object System.Drawing.Bitmap(180, 180, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$g   = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$srcRect = New-Object System.Drawing.Rectangle(0, 0, $img.Width, $img.Height)
$dstRect = New-Object System.Drawing.Rectangle(0, 0, 180, 180)
$g.DrawImage($img, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()
$bmp.Save("$proj\public\apple-touch-icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Output 'OK apple-touch-icon.png'

$img.Dispose()
