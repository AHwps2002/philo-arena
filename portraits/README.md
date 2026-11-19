# 历史画像

把公有领域的历史画像放进这个文件夹，人物卡会自动优先使用它们；找不到文件时才退回内置的 SVG 肖像。

## 命名

文件名必须是哲学家的名字，扩展名支持 `.jpg` / `.png` / `.webp`：

```
portraits/苏格拉底.jpg
portraits/尼采.png
portraits/维特根斯坦.webp
```

建议用接近正方形的图（会自动裁成圆形），边长 400–800px 即可。

## 从哪里找

- Wikimedia Commons：搜索「人名 + portrait」，筛选 Public Domain；
- 大都会博物馆、卢浮宫等机构的开放获取（Open Access）图库；
- 注意：19 世纪以前的画像多为公有领域；20 世纪的照片可能仍有版权（如波伏娃、罗素、蒯因的摄影肖像），使用前请确认。

## 自动下载

`fetch-portraits.ps1` 会按名字到 Commons 搜索并下载第一张结果。**它只负责批量抓取，不保证选对**——下载后请逐张检查，删掉不对的（删掉后会自动退回 SVG 肖像）。

在本机 PowerShell 里运行：

```powershell
cd philo-arena\portraits
.\fetch-portraits.ps1
```
