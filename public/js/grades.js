let url = new URL(location.href);
let loginId = url.searchParams.get('id');
let loginPwd = url.searchParams.get('pwd');
let admission = Number(loginId.slice(1, 4)); //入學年度
let boolTerm = false;
let boolSemester = false;
let term = document.getElementById('Term');
let semester = document.getElementById('Semester');
let courseTable = document.getElementById('courseTable');
let curCredit = document.getElementById('currNumber');
let totalCredit = document.getElementById('goalNumber');
let creditAcq = document.getElementById('totalNumber');
let creditAll = document.getElementById('totalNumber1');
let curScore = document.querySelector('.currScore');
let totalScore = document.querySelector('.totalScore');
curScore.style.display = "none";
totalScore.style.display = "none";
let res = null;
axios.post('https://my-nuk-api.herokuapp.com/api/grades', {
            id: loginId,
            pwd: loginPwd
    })
    .then(function (response) {
        if (response.request.readyState === 4 && response.status === 200) {
            alert('載入成功!');
            res = response.data;
        } else {
            alert('Error: With Internet Problem');
        }
    });
term.addEventListener('change', changeTerm);
semester.addEventListener('change', changeSemester);

function changeTerm() {
    boolTerm = true;
    getData();
}

function changeSemester() {
    boolSemester = true;
    getData();
}

function getData() {
    if (boolSemester && boolTerm) {
        let search_index = 2 * (Number(semester.value) - admission) + Number(term.value) - 1;
        if (res.grades[search_index] != undefined) {
            courseTable.innerHTML = null; //清空Table
            showTitle(); //Table加上標題
            showData(search_index); //Table加上查詢內容
            showGraph(search_index);
        } else
            alert('Error: Wrong information.')
    }
};
//動態產生年度選項
for (let i = admission; i < admission + 5; i++) {
    let option = document.createElement('option');
    option.setAttribute('value', i);
    option.textContent = i;
    semester.appendChild(option);
}

function showGraph(search_index){
    drawPic_semester(res.grades[search_index].stats.earnedCredits,res.grades[search_index].stats.allCredits);
    drawPic_total(res.stats.earnedCredits,res.stats.allCredits);
}

function drawPic_total(cur,total){
    totalScore.style.display = "block";
    let temp_cur = 0;
    let temp_total = 0;
    let timer = window.setInterval(count,45);
    function count(){
        creditAcq.textContent = temp_cur;
        creditAll.textContent = temp_total;
        if(temp_cur < cur)
            temp_cur++;
        if(temp_total < total)
            temp_total++;
        let totalPercent = temp_cur / total;
        totalScore.style.strokeDasharray = String(totalPercent*314) + ',' + String(314-totalPercent*314);
        if(temp_cur==cur && temp_total==total)
            clearInterval(timer);
    }
}

function drawPic_semester(cur,total){
    curScore.style.display = "block";
    let temp_cur = 0;
    let temp_total = 0;
    let timer = window.setInterval(count,45);
    function count(){
        curCredit.textContent = temp_cur;
        totalCredit.textContent = temp_total;
        if(temp_cur < cur)
            temp_cur++;
        if(temp_total < total)
            temp_total++;
        let curPercent = temp_cur / total;
        curScore.style.strokeDasharray = String(curPercent*314) + ',' + String(314-curPercent*314);
        if(temp_cur==cur && temp_total==total)
            clearInterval(timer);
    }
}

function showData(search_index) {
    let course = res.grades[search_index].subjects;
    let courseNum = res.grades[search_index].subjects.length;
    let tbody = document.createElement('tbody');
    for (let i in course) {
        let tr = document.createElement('tr');
        let tdCode = document.createElement('td');
        let tdName = document.createElement('td');
        let tdScore = document.createElement('td');
        tdCode.textContent = course[i].id;
        tdName.textContent = course[i].name;
        tdScore.textContent = course[i].score;
        tdCode.setAttribute('class', 'wid-90');
        tdScore.setAttribute('class', 'wid-60');
        tr.appendChild(tdCode);
        tr.appendChild(tdName);
        tr.appendChild(tdScore);
        tbody.appendChild(tr);
    }
    courseTable.appendChild(tbody);
}

function showTitle() {
    let thead = document.createElement('thead');
    let tr = document.createElement('tr');
    let code = document.createElement('td');
    let name = document.createElement('td');
    let score = document.createElement('td');
    code.textContent = '課號';
    name.textContent = '課程名稱';
    score.textContent = '分數';
    tr.appendChild(code);
    tr.appendChild(name);
    tr.appendChild(score);
    thead.appendChild(tr);
    thead.setAttribute('class', 'table-dark');
    courseTable.appendChild(thead);
}