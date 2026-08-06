$ErrorActionPreference = "Continue"
$base = "https://vapespot.store"
$deadline = (Get-Date).AddMinutes(12)
$ok = $false

while ((Get-Date) -lt $deadline) {
  try {
    $sm = (Invoke-WebRequest -Uri "$base/sitemap.xml" -UseBasicParsing -TimeoutSec 30).Content
    $robots = (Invoke-WebRequest -Uri "$base/robots.txt" -UseBasicParsing -TimeoutSec 30).Content
    $city = (Invoke-WebRequest -Uri "$base/vapespot-sydney-cbd/" -UseBasicParsing -TimeoutSec 30).Content

    $sitemapFresh = $sm -match "2026-08-06"
    $robotsOk = $robots -match "Sitemap: https://vapespot.store/sitemap.xml"
    $faqOk = $city -match "FAQPage"

    if ($sitemapFresh -and $robotsOk -and $faqOk) {
      Write-Output ("DEPLOY OK sitemap_fresh=" + $sitemapFresh + " robots=" + $robotsOk + " faq_sydney=" + $faqOk)
      $ok = $true
      break
    } else {
      Write-Output "POLL sitemap=$sitemapFresh robots=$robotsOk faq=$faqOk"
    }
  } catch {
    Write-Output ("POLL retry: " + $_.Exception.Message)
  }
  Start-Sleep -Seconds 20
}

if (-not $ok) {
  Write-Output "DEPLOY TIMEOUT: prod pas encore a jour apres 5min"
}