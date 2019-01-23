const getHash = require('../../../module/back/util/encryption');
const { sendMail } =  require('../../../module/back/util/mailer');
const { getRandomInt8 } = require('../../../module/back/util/getRandomInt');


app.get('/common/find_user', (req, res) => {
    res.send(TMPL.layout.hnmf({
        css: `
            <link rel="stylesheet" href="/front/css/common/find_user.css">
        `,
        header: TMPL.layout.accountHeader('find_user'),
        main: `
            <div id="main">
                <div class="container">
                    <div class="wrap">
                        <div class="id_wrap">
                            <h2>아이디 찾기</h2>
                            <div class="input_wrap">
                                <label for="id_name">이름 (회사 명)</label>
                                <input type="text" name="id_name">
                            </div>
                            <div class="input_wrap">
                                <label for="id_phone_num">휴대폰 번호</label>
                                <input type="text" name="id_phone_num">
                            </div>
                            <button type="button" class="id_find_btn">아이디찾기</button>
                        </div>
                        <div class="pw_wrap">
                            <h2>비밀번호 찾기</h2>
                            <div class="input_wrap">
                                <label for="pw_id">아이디</label>
                                <input type="text" name="pw_id">
                            </div>
                            <div class="input_wrap">
                                <label for="pw_phone_num">휴대폰 번호</label>
                                <input type="text" name="pw_phone_num">
                            </div>
                            <button type="button" class="pw_find_btn">비밀번호 찾기</button>
                        </div>
                    </div>
                </div>
            </div>
        `,
        footer: ``,
        script: `
        <script src="/front/script/common/find_user.js"></script>
        <script>
        go('.id_wrap', $, FindUser.Do.findId)
        go('.pw_wrap', $, FindUser.Do.findPw)
        </script>
        `
    }));
});

app.post('/api/common/find_user/id', (req, res, next) => {
    go(
        req.body,
        pipeT(
            a => QUERY`SELECT * FROM users WHERE info ->> 'name' = ${a.name} OR info ->> 'brand_name' = ${a.name} AND info --> 'phone_num' = ${a.phone_num}`,
            b => {
                if (b.length === 0) {
                    throw 'the id does not exist';
                }
                return b;
            },
            first,
            d => d.id,
            res.json
        ).catch(
            match
                .case('the id does not exist')(_ => 'id')
                .else(_ => ''),
            m => new Error(m),
            next
        )
    )
});

app.post('/api/common/find_user/pw', (req, res, next) => {
    const newPw = String(getRandomInt8());
   go(
       req.body,
       pipeT(
           a => QUERY`SELECT * FROM users WHERE id = ${a.id}`,
           b => {
               if (b.length === 0) {
                   throw 'the id does not exist';
               }
               return b;
           },
           first,
           async c => {
               if (c.info.phone_num !== req.body.phone_num) {
                   throw 'the phone number wrong number';
               }
               await sendMail(
                   '스핀 프로토콜에서 보내는 메일입니다.',
                   `스핀 프로토콜에서 비밀번호 재발급을 위해 임시 비밀번호 [ ${newPw} ]를 드립니다.`,
                   c.id
               ).catch(err => {
                   return err;
               });
               return c;
           },
           d => QUERY`UPDATE users SET pw = ${getHash(newPw)} WHERE id = ${d.id} RETURNING true`,
           res.json
       ).catch(
           match
               .case('the id does not exist')(_ => 'id')
               .case('the phone number wrong number')(_ => 'phone_num')
               .else(_ => ''),
           m => new Error(m),
           next
       )
   )
});