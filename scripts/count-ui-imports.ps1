$root = "C:\Users\Mitson informatique\Desktop\vapespot_work\src"
$counts = @{}
$pat = [regex]'@/components/ui/([a-z0-9-]+)'
$pat2 = [regex]'ui/([a-z0-9-]+)[\x27\x22];'
Get-ChildItem $root -Recurse -File | Where-Object { $_.Extension -in ".ts",".tsx" -and $_.FullName -notmatch "\\ui\\" } | ForEach-Object {
  $c = Get-Content $_.FullName -Raw
  foreach ($rx in @($pat,$pat2)) {
    $m = $rx.Matches($c)
    foreach ($x in $m) {
      $k = $x.Groups[1].Value
      if ($counts.ContainsKey($k)) { $counts[$k]++ } else { $counts[$k] = 1 }
    }
  }
}
$counts.GetEnumerator() | Sort-Object Value -Descending | ForEach-Object { "{0,3}x  {1}" -f $_.Value, $_.Key }