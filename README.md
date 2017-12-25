`tools` 文件夹各个文件功能说明：
  1. `analyzesingle.js`：对于一些需要登录才能查看的网页，先把网页 html 内容粘贴到 `output/htmlcontent.txt` 里，然后将网页 url 替换到 `analyzesingle.js` 的 `url` 变量，就可以通过离线存储的 html 文本文件提取有用的内容，随后直接替换到 `output/full_output.json`中。
  2. `checkduplicate.js`：`output/full_output.json` 查重
  3. `checkintegrity.js`：比较 `output/full_output.json` 和 `output/all.json`，找到遗漏。
  4. `gendirector`：按照导演分类，通过 `output/full_output.json` 生成统计信息。
  5. `genoutput.js`：生成前端页面所需的 js 文件，会顺道做完整性检测。
  6. `genrecommand.js`：按照预设权重分析推荐观看的电影，生成文件 `output/recommand.txt`。
  7. `genyear.js`：按照年份分类，通过 `output/full_output.json` 生成统计信息。
  8. `imageinfo.js`：接受一个 **url** 作为参数，输出图像尺寸和主导色。

**npm scripts** 作用：
  1. `nightmare`：用 nightmare 的方式获取一遍电影的简要信息，会输出一个 `output/all.json`，目的是补漏
  2. `director`：调用 `tools/gendirector.js`。
  3. `year`：调用 `tools/genyear.js`。
  4. `recommand`：调用 `tools/genrecommand.js`。
  5. `single`：调用 `analyzesingle.js`。
  6. `complete`：借助 nightmare 检查完整性，补全不完整项。