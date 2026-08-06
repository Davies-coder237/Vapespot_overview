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

# Icône pleine (sans masque) pour la maskable (Android applique son propre masque)
function New-Square([int]$size, [string]$out) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $g   = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $srcRect = New-Object System.Drawing.Rectangle(0, 0, $img.Width, $img.Height)
    $dstRect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $g.DrawImage($img, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Output ("OK {0} ({1}x{1} plein)" -f (Split-Path $out -Leaf), $size)
}

# Favicons circulaires, plusieurs tailles
New-CircularFavicon 256 "$proj\public\favicon.png"
New-CircularFavicon 192 "$proj\public\favicon-192.png"
New-CircularFavicon 48  "$proj\public\favicon-48.png"
New-CircularFavicon 32  "$proj\public\favicon-32.png"
New-CircularFavicon 16  "$proj\public\favicon-16.png"

# Icônes pleines
New-Square 512 "$proj\public\icon-512.png"
New-Square 180 "$proj\public\apple-touch-icon.png"

# favicon.ico : conteneur ICO qui embarque les PNG 16/32/48 (format ICO moderne)
function New-Ico([string]$out) {
    $entries = @(
        @(16, "favicon-16.png"),
        @(32, "favicon-32.png"),
        @(48, "favicon-48.png")
    )
    $datas = @()
    foreach ($e in $entries) {
        $datas += ,[System.IO.File]::ReadAllBytes((Join-Path "$proj\public" $e[1]))
    }
    $count  = $datas.Count
    $offset = 6 + 16 * $count
    $ms = New-Object System.IO.MemoryStream
    $bw = New-Object System.IO.BinaryWriter($ms)
    $bw.Write([byte]0); $bw.Write([byte]0)          # reserved
    $bw.Write([byte]1); $bw.Write([byte]0)          # type = icon
    $bw.Write([byte]$count); $bw.Write([byte]0)     # count
    $cum = $offset
    for ($i = 0; $i -lt $count; $i++) {
        $size = [int]$entries[$i][0]
        $data = $datas[$i]
        $bw.Write([byte]$size); $bw.Write([byte]$size)   # width / height
        $bw.Write([byte]0); $bw.Write([byte]0)           # palette / reserved
        $bw.Write([uint16]1); $bw.Write([uint16]32)      # planes / bit count
        $bw.Write([uint32]$data.Length)                  # bytes in resource
        $bw.Write([uint32]$cum)                          # offset
        $cum += $data.Length
    }
    foreach ($d in $datas) { $bw.Write($d) }
    $bw.Flush()
    [System.IO.File]::WriteAllBytes($out, $ms.ToArray())
    $bw.Dispose(); $ms.Dispose()
    Write-Output ("OK {0} ({1} images)" -f (Split-Path $out -Leaf), $count)
}

New-Ico "$proj\public\favicon.ico"

$img.Dispose()
