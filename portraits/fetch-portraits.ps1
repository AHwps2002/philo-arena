# 从 Wikimedia Commons 批量抓取肖像（需联网）
# 用法：在本目录下运行 .\fetch-portraits.ps1
# 注意：自动取搜索第一条，可能抓到雕像、书封或他人照片，请逐张核对。

$ErrorActionPreference = "Continue"
$out = $PSScriptRoot

$map = [ordered]@{
  "苏格拉底" = "Socrates"; "柏拉图" = "Plato"; "亚里士多德" = "Aristotle"
  "尼采" = "Friedrich Nietzsche"; "康德" = "Immanuel Kant"; "黑格尔" = "G.W.F. Hegel"
  "维特根斯坦" = "Ludwig Wittgenstein"; "加缪" = "Albert Camus"; "萨特" = "Jean-Paul Sartre"
  "海德格尔" = "Martin Heidegger"; "叔本华" = "Arthur Schopenhauer"; "马克思" = "Karl Marx"
  "第欧根尼" = "Diogenes"; "赫拉克利特" = "Heraclitus"; "巴门尼德" = "Parmenides"
  "芝诺" = "Zeno of Elea"; "休谟" = "David Hume"; "斯宾诺莎" = "Baruch Spinoza"
  "克尔凯郭尔" = "Søren Kierkegaard"; "波伏娃" = "Simone de Beauvoir"; "罗素" = "Bertrand Russell"
  "弗雷格" = "Gottlob Frege"; "毕达哥拉斯" = "Pythagoras"; "费希特" = "Johann Gottlieb Fichte"
  "谢林" = "Friedrich Schelling"; "胡塞尔" = "Edmund Husserl"; "雅斯贝尔斯" = "Karl Jaspers"
  "梅洛-庞蒂" = "Maurice Merleau-Ponty"; "列维纳斯" = "Emmanuel Levinas"; "卡尔纳普" = "Rudolf Carnap"
  "蒯因" = "Willard Van Orman Quine"; "戴维森" = "Donald Davidson"; "克里普克" = "Saul Kripke"
  "刘易斯" = "David Lewis"
}

$ua = @{ "User-Agent" = "philo-arena/1.0 (educational project)" }

foreach ($cn in $map.Keys) {
  $term = $map[$cn]
  $api = "https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search" +
         "&gsrsearch=" + [uri]::EscapeDataString("$term portrait") +
         "&gsrnamespace=6&gsrlimit=1&prop=imageinfo&iiprop=url&iiurlwidth=600"
  try {
    $r = Invoke-RestMethod -Uri $api -Headers $ua -TimeoutSec 30
    if (-not $r.query.pages) { Write-Host "空   $cn"; continue }
    $page = $r.query.pages.PSObject.Properties.Value | Select-Object -First 1
    $src = $page.imageinfo[0].thumburl
    if (-not $src) { $src = $page.imageinfo[0].url }
    $dest = Join-Path $out ($cn + ".jpg")
    Invoke-WebRequest -Uri $src -OutFile $dest -Headers $ua -TimeoutSec 60
    Write-Host ("OK   {0}  <-  {1}" -f $cn, $page.title)
  } catch {
    Write-Host ("FAIL {0}  {1}" -f $cn, $_.Exception.Message)
  }
  Start-Sleep -Milliseconds 250
}

Write-Host ""
Write-Host "完成。请打开 portraits 目录逐张核对："
Write-Host " - 是否是该人物；"
Write-Host " - 是否为公有领域（19 世纪以前的画作一般没问题，20 世纪照片需确认）。"
Write-Host "删掉不对的文件后，人物卡会自动退回内置肖像。"
