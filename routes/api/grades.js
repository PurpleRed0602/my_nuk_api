var express = require('express');
var request = require('request');
var iconv = require('iconv-lite');
var cheerio = require('cheerio');

var router = express.Router();

router.get('/', (req, res) => {
    let id = req.query.id;
    let pwd = req.query.pwd;
    let requestHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.164 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded'
    };

    let loginRequest = request.defaults({ jar: true }); // cookie開啟
    loginRequest({
        url: 'https://aca.nuk.edu.tw/Student2/Menu1.asp',
        method: 'POST',
        encoding: null,
        followRedirect: false,
        form: {
            Account: id,
            Password: pwd
        },
        headers: requestHeaders
    }, (err, res, body) => {
        /* 如果偵測到錯誤或是收到的body為空 */
        if (err || !body) {
            fail('無法連接到高大教務系統', 'Unable to reach NUK server.');
        } else {
            let result = iconv.decode(body, 'big-5');  // 學校網站用big-5，否則會讀到亂碼
            let $ = cheerio.load(result);
            if ($('h1').text().trim() == '物件已移動') {
                let cookie = res.headers['set-cookie'][0];  // sessionID
                gotoScorePage(cookie);
            } else {
                fail('帳號或密碼輸入錯誤', 'Wrong account or password.');  // 使用者輸入錯的帳號密碼
            }
        }
    });

    function gotoScorePage(cookie) {
        let gradeRequest = request.defaults({ jar: true }); // cookie開啟
        gradeRequest({
            url: 'https://aca.nuk.edu.tw/Student2/SO/ScoreQuery.asp',
            method: 'POST',
            encoding: null,
            headers: requestHeaders,
            Cookie: cookie
        }, (err, res, body) => {
            if (err || !body) {
                fail('無法連接到高大教務系統', 'Unable to reach NUK server.');
            } else {
                let result = iconv.decode(body, 'big-5');
                let $ = cheerio.load(result);



                /* 學生資料 */
                let student = [];
                for (let i = 1; i < 5; i++) {
                    let studentPos = $('body > table:nth-child(1) > tbody > tr > td:nth-child(' + i + ')').text();
                    student.push(studentPos.slice(3));
                }
            
                /* 學生所有學期成績 迴圈會跑該學生所就讀的學期次 */
                let grades = [];
                for (let i = 1; i < $('font:contains("學期")').length; i++) {
                    /* semester */
                    let semesterStr = $('font:contains("學期"):eq(' + (i - 1) + ')').text();
                    let semester = [parseInt(semesterStr.slice(0, 3)), parseInt(semesterStr.slice(8, 9))];  // [學年度, 學期]

                    /* subjects */
                    let subjects = [];
                    let tablePos = 'body > table:nth-child(' + (i * 4 + 1) + ') > tbody';
                    for (let j = 2; $(tablePos + ' > tr:nth-child(' + j + ') > td:nth-child(2)').text() != ''; j++) {
                        let rowPos = tablePos + ' > tr:nth-child(' + j + ')';
                        let oneCourse = {
                            'id': $(rowPos + ' > td:nth-child(1)').text().substring(0, 2) + '-' + $(rowPos + ' > td:nth-child(1)').text().substring(2),
                            'name': $(rowPos + ' > td:nth-child(2)').text(),
                            'credit': $(rowPos + ' > td:nth-child(3)').text(),
                            'score': $(rowPos + ' > td:nth-child(6)').text()
                        };
                        subjects.push(oneCourse);
                    }

                    /* stats */
                    let statsPos = 'body > p:nth-child(' + (i * 4 + 2) + ')';
                    let stats = {};
                    if (i == $('font:contains("學期")').length - 1) {
                        stats = {
                            "allCredits": $(statsPos + ' > table:nth-child(1) > tbody > tr > td:nth-child(1) > b').text().substring(6),
                            "earnedCredits": $(statsPos + ' > table:nth-child(1) > tbody > tr > td:nth-child(2) > b').text().substring(6),
                            "avgScore": $(statsPos + ' > table:nth-child(1) > tbody > tr > td:nth-child(3) > b').text().substring(5),
                            "ranking": $(statsPos + ' > table:nth-child(1) > tbody > tr > td:nth-child(4) > b').text().substring(13)
                        };
                    } else {
                        stats = {
                            "allCredits": $(statsPos + ' > table > tbody > tr > td:nth-child(1)').text().substring(6),
                            "earnedCredits": $(statsPos + ' > table > tbody > tr > td:nth-child(2)').text().substring(6),
                            "avgScore": $(statsPos + ' > table > tbody > tr > td:nth-child(3)').text().substring(5),
                            "ranking": $(statsPos + ' > table > tbody > tr > td:nth-child(4)').text().substring(13)
                        };
                    }
                    
                    let oneSemester = {
                        'semester': semester,
                        'subjects': subjects,
                        'stats': stats
                    }; // 整學期的檔案

                    grades.push(oneSemester);
                }

                let finalStatsPos = 'body > table:nth-child(' + ($('font:contains("學期")').length * 4) + ') > tbody > tr:nth-child(2)';
                let finalStats = {
                    "allCredits": $(finalStatsPos + ' > td:nth-child(1)').text().substring(9),
                    "earnedCredits": $(finalStatsPos + ' > td:nth-child(2)').text().substring(8),
                    "avgScore": $(finalStatsPos + ' > td:nth-child(3)').text().substring(7),
                    "ranking": $(finalStatsPos + ' > td:nth-child(4)').text().substring(7)
                };

                /* 最終要送出的json */
                let finalResult = {
                    'status': 'success',
                    'student': student,
                    'grades': grades,
                    'stats': finalStats
                };

                /* 輸出 */
                showPage(JSON.stringify(finalResult, null, 2));
            }
        });
    }

    function showPage(jsonData) {
        res.set('content-type', 'application/json');
        res.send(jsonData);
    }

    function fail(message, log) {
        let finalResult = {
            'status': 'fail',
            'reason': message,
            'log': log
        };
        showPage(JSON.stringify(finalResult, null, 2));
    }
});

module.exports = router;