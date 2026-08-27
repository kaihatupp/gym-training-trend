Add-Type -AssemblyName System.Drawing

function New-GymIcon {
    param(
        [int]$Size,
        [string]$Path
    )

    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    $bgColor = [System.Drawing.ColorTranslator]::FromHtml('#2f5d7d')
    $g.Clear($bgColor)

    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)

    # ダンベルのバー(横棒)
    $barThickness = $Size * 0.12
    $barLength = $Size * 0.5
    $g.FillRectangle(
        $whiteBrush,
        [float]($Size / 2 - $barLength / 2),
        [float]($Size / 2 - $barThickness / 2),
        [float]$barLength,
        [float]$barThickness
    )

    # ダンベルの両端(丸いプレート)
    $plateSize = $Size * 0.32
    $plateX = $Size / 2 - $barLength / 2 - $plateSize / 2
    $g.FillEllipse($whiteBrush, [float]$plateX, [float]($Size / 2 - $plateSize / 2), [float]$plateSize, [float]$plateSize)
    $plateX2 = $Size / 2 + $barLength / 2 - $plateSize / 2
    $g.FillEllipse($whiteBrush, [float]$plateX2, [float]($Size / 2 - $plateSize / 2), [float]$plateSize, [float]$plateSize)

    $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

$iconsDir = Join-Path $PSScriptRoot 'icons'
if (-not (Test-Path $iconsDir)) {
    New-Item -ItemType Directory -Path $iconsDir | Out-Null
}

New-GymIcon -Size 192 -Path (Join-Path $iconsDir 'icon-192.png')
New-GymIcon -Size 512 -Path (Join-Path $iconsDir 'icon-512.png')
New-GymIcon -Size 512 -Path (Join-Path $iconsDir 'icon-512-maskable.png')
New-GymIcon -Size 180 -Path (Join-Path $iconsDir 'apple-touch-icon.png')

Write-Output "Icons generated in $iconsDir"
