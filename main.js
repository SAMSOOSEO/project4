import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

// CSV 파일 경로 (로컬 서버에 있어야 함)
const csvPath = "bike.csv"; // 예: 같은 폴더에 data.csv가 있어야 함

async function loadCSV() {
  const data = await d3.csv(csvPath);
  return data;
}

function renderTable(data) {
  const container = d3.select("#csv-table-container");
  container.html(""); // 기존 내용 제거

  const table = container.append("table");
  const thead = table.append("thead");
  const tbody = table.append("tbody");

  // 헤더
  thead.append("tr")
    .selectAll("th")
    .data(data.columns)
    .join("th")
    .text(d => d);

  // 데이터 행
  tbody.selectAll("tr")
    .data(data)
    .join("tr")
    .selectAll("td")
    .data(d => data.columns.map(c => d[c]))
    .join("td")
    .text(d => d);
}

// 실행
(async function() {
  const data = await loadCSV();
  renderTable(data);
})();
