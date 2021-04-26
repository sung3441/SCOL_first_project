var http = require("http");
var express = require("express"); //외부모듈
var app = express(); //서버 객체 생성
var static = require("serve-static"); //파일 고정 경로를 위한 외부 모듈
var ejs = require("ejs"); //ejs 외부 모듈 다운로드
var mysql = require("mysql"); //mysql 외부 모듈 다운로드
var fs = require("fs"); //파일 처리를 위한 외부 모듈 다운로드
var expressSession = require("express-session");
var mymodule=require("./lib/mymodule.js");
var multer = require("multer"); //외부 모듈
var path = require("path"); //외부 모듈
const conStr = { //mysql에 접속하기 위한 설정 값
    user : "root",
    password : "1234",
    url : "localhost",
    database : "scol_1"
}

app.set("view engine", "ejs"); //뷰 엔진 ejs 등록
app.use(static(__dirname+"/static")); //고정 경로 지정
app.use(express.urlencoded({
    extended : true
}));

//세션설정
app.use(expressSession({
    secret : "key secret",
    resave : true, //세션을 다시 저장할껀지
    saveUninitialized : true
}));

//게임 이미지 & 게임 zip 파일 업로드용 멀터
var gameUpload=multer({
    storage: multer.diskStorage({//어디에 저장할지, 제이슨 안쪽이기때문에 세미콜론 XX
        destination:function(request, file, cb){
            cb(null, __dirname+"/static/upload/game_img");//업로드한 파일이 저장되는 곳
        },
        filename:function(request, file, cb){
            //업로드한 파일에 따라서 파일 확장자는 틀려진다..프로그래밍적으로 정보를 추출해야 한다!!
            // path.extname(file.originalname)의 결과는 jpg,png..
            cb(null, new Date().valueOf()+path.extname(file.originalname));
        }
    })  
});

//상품 이미지 업로드용 멀터
var productUpload=multer({
    storage: multer.diskStorage({//어디에 저장할지, 제이슨 안쪽이기때문에 세미콜론 XX
        destination:function(request, file, cb){
            cb(null, __dirname+"/static/upload/product_img");//업로드한 파일이 저장되는 곳
        },
        filename:function(request, file, cb){
            //업로드한 파일에 따라서 파일 확장자는 틀려진다..프로그래밍적으로 정보를 추출해야 한다!!
            // path.extname(file.originalname)의 결과는 jpg,png..
            cb(null, new Date().valueOf()+path.extname(file.originalname));
        }
    })    
});

//커뮤니티 이미지 업로드용 멀터
var communityUpload = multer({
    storage: multer.diskStorage({
        destination:function(request, file, cb){
           cb(null, __dirname+"/static/upload/community_img");
        },
        filename:function(request, file, cb){
            console.log("file is ", file);
            //업로드한 파일에 따라서 파일 확장자는 틀려진다..프로그래밍적으로 정보를 추출해야 한다!!
            //path.extname(file.originalname)의 결과는 jpg,png...
            cb(null, new Date().valueOf()+path.extname(file.originalname));
        }
    })    
});

//shop========================================================

//로그인 시 일반 사용자 ID로 로그인 하면 가장 먼저 보게되는 페이지//메인 페이지
//세션 검사 추가 하기!!!!
app.get("/shop/main", function(request, response){
    var member = request.session.member;
    var sql_topcategory = "select * from topcategory";
    var sql_game = "select * from game where game_kind=?";
    var sql_community = "select * from community";
    var con = mysql.createConnection(conStr);
    con.query(sql_topcategory, function(error, result_topcategory, fields){
        if(error){
            console.log("탑 카테고리 조회 실패", error);
        }else{
            con.query(sql_game, [member.user_kind], function(error, result_game, fields){
                if(error){
                    console.log("사용자용 게임 조회 실패", error);
                }else{
                    con.query(sql_community, function(error, result_community, fields){
                        if(error){
                            console.log("커뮤니티 조회 실패", error);
                        }else{
                            response.render("shop/main", {
                                topList : result_topcategory,
                                gameList : result_game,
                                communityList : result_community,
                                member : member,
                                lib : mymodule
                            });
                        }
                        con.end();
                    });
                }
            });      
        }
    })
});

//상단 네비에서 game클릭 시 등장하는 게임 목록!!
app.get("/shop/game/list", function(request, response){
    var currentPage = request.query.currentPage;
    var search = false;
    if(currentPage == undefined){
        currentPage = 1;
    }
    var sql = "select * from game order by game_id desc";
    var con = mysql.createConnection(conStr);
    con.query(sql, function(error, result, fields){
        if(error){
            console.log("게임 테이블 조회 실패");
        }else{
            console.log("조회한 게임의 정보는 :", result);
            response.render("shop/game/list", {
                param : {
                    record : result,
                    currentPage : currentPage,
                    search : search,
                },
                member : request.session.member
            });
        }
        con.end();
    });
});

//게임 검색시 오게 되는 곳!
app.get("/shop/game/search-list", function(request, response){
    var currentPage = 1;
    var game_name = request.query.game_name;
    var search = true;
    console.log("넘어온 게임 아이디는", game_name);
    var sql = "select * from game where game_name=?";
    var con = mysql.createConnection(conStr);
    con.query(sql, [game_name],function(error, result, fields){
        if(error){
            console.log("게임 검색 실패", error);
        }else{
            response.render("shop/game/list", {
                param : {
                    record : result,
                    currentPage : currentPage,
                    search : search,
                },
                member : request.session.member
            });
        }
        con.end();
    });
});

//game다운로드 요청!!
app.get("/shop/game/download", function(request, response){
    var game_id = request.query.game_id;
    var sql = "select * from game where game_id="+game_id;
    var con = mysql.createConnection(conStr);
    con.query(sql, function(error, result, fields){
        if(error){
            console.log("게임 한건 조회 실패", error);
        }else{
            con.query("update game set game_hit=game_hit+1 where game_id="+game_id, function(error, fields){
                if(error){
                    console.log("다운로드 수 증가 실패", error);
                }else{
                    response.render("shop/game/download", {
                        record : result[0],
                        member : request.session.member
                    });
                }
                con.end();
            });
        }
    });
});

//상점 목록 조회 요청!!
app.get("/shop/product/list", function(request, response){
    var currentPage = request.query.currentPage;
    var topcategory_id = request.query.topcategory_id;
    console.log("내가 선택한 카테고리 넘버!!!!!", topcategory_id)
    if(currentPage == undefined){
        currentPage = 1;
    }
    //외래키로 들어와 있는 topcategory 를 조인해서 사용해 줘야함!!
    //탑 카테고리를 선택 안했거나 , 전체보기를 선택한 경우!!
    var sql = "select product_id, top_name, product_name, p.topcategory_id,";
    sql += " product_price, product_detail, product_img from ";
    if(request.query.topcategory_id == 0 || request.query.topcategory_id == undefined){
        sql += "product p, topcategory t where p.topcategory_id = t.topcategory_id ";
    }else{
        sql += "product p, topcategory t where p.topcategory_id = t.topcategory_id && p.topcategory_id="+topcategory_id;
    }
    sql += " order by product_id desc";
    
    var con = mysql.createConnection(conStr);
    con.query(sql, function(error, result, fields){
        if(error){
            console.log("상품 목록 조회 실패", error);
        }else{
            console.log(result);
            response.render("shop/product/list", {
                param : {
                    record : result,
                    currentPage : currentPage,
                },
                category : topcategory_id,
                member : request.session.member
            });
        }
        con.end();
    });
});

//상품 상세보기 요청!!!
app.get("/shop/product/detail", function(request, response){
    var ea = request.query.ea;
    if(ea == undefined){
        ea = 1;
    }
    var product_id = request.query.product_id;
    var sql = "select product_id, top_name, product_name, ";
    sql += "product_price, product_detail, product_img from ";
    sql += "product p, topcategory t where p.topcategory_id = t.topcategory_id && product_id="+product_id;
    sql += " order by product_id desc";
    var con = mysql.createConnection(conStr);
    con.query(sql, function(error, result, fields){
        if(error){
            console.log("제품 상세 보기 조회 실패", error);
        }else{
            response.render("shop/product/detail", {
                record : result[0],
                ea : ea,
                member : request.session.member
            });
        }
        con.end();
    });
});

//배송 주문 요청 처리!!!
app.post("/shop/product/delivery", function(request, response){
    
    var login_id = request.session.member.login_id;
    var product_id = request.body.product_id;
    var zip = request.body.zip;
    var addr = request.body.addr1+request.body.addr2;
    var memo = request.body.memo;
    var price = request.body.price;
    var ea = request.body.ea;
    if(request.session.member.money-(price*ea) < 0){
        console.log("잔액 부족");
        response.redirect("/shop/product/list");
    }else{
        var con = mysql.createConnection(conStr);
        var sql = "update login set money=money-"+price*ea+" where login_id="+login_id;

        con.query(sql, function(error, fields){
            if(error){
                console.log("잔액 차감 실패", error);
            }else{
                sql = "insert into delivery(product_id, zip, addr, memo, ea, login_id) values(?, ?, ?, ?, ?, ?)";
                con.query(sql, [product_id, zip, addr, memo, ea, login_id], function(error, fields){
                    if(error){
                        console.log("주문정보 입력 실패", error);
                    }else{
                        //세션 어데이트 
                        request.session.member.money -= price*ea;
                        response.writeHead(200, {"Content-Type":"text/html;charset=utf8;"});
                        response.end(mymodule.getMsgUrl("주문완료!", "/shop/product/bill"));
                    }
                    con.end();
                });
            }
        });
    }
});


//방금 주문한 배송 영수증 처리!!
app.get("/shop/product/bill", function(request, response){
    var sql = "select max(delivery_id) as delivery_id from delivery";
    var con = mysql.createConnection(conStr);
    con.query(sql, function(error, record, fiedls){
        if(error){
            console.log("주문 정보 조회 실패", error);

        }else{
            var delivery_id = record[0].delivery_id
            sql = "select zip, addr, memo, ea, product_name,";
            sql += " product_price, product_detail from product p,"
            sql += " delivery d where p.product_id=d.product_id && delivery_id="+delivery_id;
            con.query(sql, function(error, result, fields){
                if(error){
                    console.log("영수증 조회 실패", error);
                }else{
                    console.log(result);
                    response.render("shop/product/bill", {
                        record : result[0],
                        member : request.session.member
                    });
                }
                con.end();
            });
        }
    });
});

//내가 구매한 물건 리스트 요청
app.get("/shop/product/delivery-list", function(request, response){
    var currentPage = request.query.currentPage;
    var login_id = request.query.login_id;
    if(currentPage == undefined){
        currentPage = 1;
    }
    var con = mysql.createConnection(conStr);
    var sql = "select zip, addr, login_id, p.product_id, ea, product_name, product_price, product_img";
    sql += " from product p, delivery d"
    sql += " where p.product_id=d.product_id && login_id = "+login_id;

    con.query(sql, function(error, result, fields){
        if(error){
            console.log("배송목록 조회 실패", error);
        }else{
            response.render("shop/product/delivery", {
                param : {
                    currentPage : currentPage,
                    record : result
                },
                member : request.session.member
            });
        }
        con.end();
    });
});

//결제 창 요청
app.get("/shop/product/pay", function(request, response){
    response.render("shop/pay")
});

//결제한 금액을 데이터베이스에 처리하는 영역
app.get("/shop/product/money", function(request, response){
    var money = request.query.money;
    console.log(money);
    var sql = "update login set money=money+"+money+" where login_id="+request.session.member.login_id;
    var con = mysql.createConnection(conStr);
    con.query(sql, function(error, fiedls){
        if(error){
            console.log("요금충전 실패", error);
        }else{
            con.query("select * from login where login_id="+request.session.member.login_id, function(error, result, fields){
                request.session.member.money = result[0].money;
                response.redirect("/shop/main");
            });
        }
        con.end();
    });
});

//커뮤니티에 글쓰기 폼 요청
app.get("/shop/community/regist_form",function(request,response){
    response.render("shop/community/regist", {
        member : request.session.member
    });
});

//커뮤니티 글 등록요청
app.post("/shop/community/regist", communityUpload.single("pic"), function(request,response){
    var writer=request.session.member.user_id;
    var title=request.body.title;
    var content=request.body.content;
    var community_img=request.file.filename;
    var con=mysql.createConnection(conStr);    
    
    console.log("글쓴이",writer);
    var sql="insert into community(title,writer,content,community_img) values(?,?,?,?)";
    
    con.query(sql,[title,writer,content,community_img],function(error,fields){
        if(error){
            console.log("sql문에러");
        }else{
          response.redirect("/shop/community/list");
        }
        con.end();
    });
});

//커뮤니티 목록 요청
app.get("/shop/community/list",function(request,response){
    var currentPage=1; //기본페이지값은 1로한다
    var search = false;
    if(request.query.currentPage!=undefined){
        currentPage=request.query.currentPage;
    }
    var con=mysql.createConnection(conStr);
    var sql="select * from community order by community_id desc";
    con.query(sql,function(error,result,fields){
        if(error){
            console.log(error);
        }else{
        //console.log(result);
            response.render("shop/community/list",{
                param:{
                    "currentPage":currentPage,
                    "record":result,
                    lib : mymodule,
                    search : search
                },
                member : request.session.member
            });
        }
        con.end();
    });
});

//커뮤니티 검색시 오게 되는 곳!
app.get("/shop/community/search-list", function(request, response){
    var select = request.query.select;
    var val = request.query.val;
    var search = true;
    console.log("조회할 항목 : "+select+"검색할 내용"+val);
    var currentPage = 1;

    var sql = "select * from community where "+select+" like '%"+val+"%'";
    var con = mysql.createConnection(conStr);
    con.query(sql, function(error, result, fields){
        if(error){
            console.log("커뮤니티 검색 실패", error);
        }else{
            console.log(result);
            response.render("shop/community/list", {
                param:{
                    "currentPage":currentPage,
                    "record":result,
                    lib : mymodule,
                    search : search
                },
                member : request.session.member
            });
        }
        con.end();
    });
});

//커뮤니티 상세보기
app.get("/shop/community/detail", function(request, response){
    var community_id = request.query.community_id;
    var con = mysql.createConnection(conStr);
    var sql="select * from community where community_id="+community_id;
    con.query(sql, function(error, result, fields){
        if(error){
            console.log("커뮤니티 상세보기 조회 실패", error);
        }else{
            con.query("update community set hit=hit+1 where community_id="+community_id, function(error, fields){
                if(error){
                    console.log("조회수 증가 실패", error);
                }else{
                    console.log(result);
                    response.render("shop/community/detail", {
                        record : result[0],
                        writer : request.session.member.user_id,
                        member : request.session.member
                    });
                }
                con.end();
            });
        }
    });
});

//커뮤니티 글 삭제요청
app.post("/shop/community/del", communityUpload.single("pic"),function(request,response){
    var community_id=request.body.community_id; //post방식의 파라미터 추출
    var community_img=request.body.filename;
    fs.unlink(__dirname+"/static/upload/community_img/"+community_img,function(err,data){
        if(err){
            console.log("삭제실패",err);
        }else{
            console.log("삭제성공");
            var sql="delete from community where community_id="+community_id
            var con=mysql.createConnection(conStr);//접속 및 커넥션 객체 반환
            con.query(sql,function(error,fields){
                if(error){
                    console.log("삭제실패",error);
                }else{
                    //목록 요청 
                    response.redirect("/shop/community/list");
                }
                con.end();
            });
        }
    });
});

//커뮤니티 글 수정 요청
app.post("/shop/community/edit", communityUpload.single("pic"),function(request,response){
    var community_id =request.body.community_id;
    var title =request.body.title;
    var writer=request.body.writer;
    var content =request.body.content;
    var filename=request.body.filename;

    console.log("파일 정보!!!!", request.file);
    if(request.file != undefined){ //업로드를 원하는것임(사진 교체)
        console.log("=====================사진도 교체합니다.");
        //사진지우기 +  db수정 
        fs.unlink(__dirname+"/static/upload/community_img/"+filename, function(err){
            if(err){
                console.log("삭제실패", err);
            }else{
            filename=request.file.filename;//새롭게 업로드된 파일명으로 교체...
            var sql="update community set title=?, writer=?, content=?, community_img=? where community_id=?";
            var con=mysql.createConnection(conStr); //mysql접속 
            con.query(sql,[title,writer,content,filename,community_id],function(error,fields){
                if(error){
                    console.log("수정실패",error)
                }else{
                    console.log("수정거쳐서 옴");
                    response.redirect("/shop/community/detail?community_id="+community_id);
                }
                con.end();//mysql disconnect!!
            });
            }
        }); 
    }else{ //사진 유지
        var sql="update community set title=?, writer=?, content=?  where community_id=?";
        var con=mysql.createConnection(conStr);
        con.query(sql,[title,writer,content,community_id],function(error,fields){
            if(error){
                console.log("수정실패",error);
            }else{
                console.log("수정거쳐서 옴");
                response.redirect("/shop/community/detail?community_id="+community_id);
            }
            con.end();
        });
    }
});

//지도 요청 처리
app.get("/shop/map", function(request, response){
    response.render("shop/map", {
        member : request.session.member
    });
})

/*
관리자 영역==============================================
*/

//회원, 로그인 영역--------------------------------------------------------------------------------

//로그인,회원가입 폼 요청
app.get("/admin/loginform",function(request,response){
    response.render("admin/login/login");
});

//회원가입 처리
app.post("/admin/login/regist",function(request,response){
    console.log(request.body);
    var user_name=request.body.user_name;
    var user_id=request.body.user_id;
    var user_pass=request.body.user_pass;
    var game_kind=request.body.game_kind;

    var sql = "select * from login where user_id=?";
    var con = mysql.createConnection(conStr);
    con.query(sql,[user_id], function(error, result, fields){
        if(error){
            console.log(error);
        }else{
            if(result.length>0){
                response.writeHead(200,{"Content-Type":"text/html;charset=utf-8"});
                response.end(mymodule.getMsgBack("사용할 수 없는 아이디 입니다."));
            }else{
                sql="insert into login(user_name, user_id, user_pass, game_kind)";
                sql+=" values(?,?,?,?)";
                con.query(sql,[user_name, user_id, user_pass, game_kind], function(error, fields){
                    if(error){
                        console.log("회원 가입 중 에러",error);
                    }else{
                        response.writeHead(200,{"Content-Type":"text/html;charset=utf-8"});
                        response.end(mymodule.getMsgUrl("회원가입에 성공하였습니다.","/admin/loginform"));
                    }
                    con.end();
                });
            }
        }
    });
});

//로그인 처리
app.post("/admin/login/login",function(request,response){
    // console.log(request.body);
    var user_id=request.body.user_id;
    var user_pass=request.body.user_pass;

    var sql="select * from login where user_id=? and user_pass=?";
    var con=mysql.createConnection(conStr);
    con.query(sql,[user_id,user_pass],function(err,result,fields){
        if(err){
            console.log("로그인 중 에러",err);
        }else{
            if(result.length<1){
                response.writeHead(200,{"Content-Type":"text/html;charset=utf-8"});
                response.end(mymodule.getMsgBack("회원가입 후 이용해주세요."));
            }else{
                // console.log(result);
                
                //세션 추가하기
                request.session.member = {
                    user_name : result[0].user_name,
                    user_id : result[0].user_id,
                    user_pass : result[0].user_pass,
                    user_kind : result[0].game_kind,
                    login_id : result[0].login_id,
                    money : result[0].money
                };
                if(user_id=="scol" && user_pass=="scol"){
                    response.writeHead(200,{"Content-Type":"text/html;charset=utf-8"});
                    response.end(mymodule.getMsgUrl("관리자 입니다","/admin/product/registform"));
                }else{
                    response.writeHead(200,{"Content-Type":"text/html;charset=utf-8"});
                    response.end(mymodule.getMsgUrl(result[0].user_name+"님 로그인 되었습니다","/shop/main"));
                }
                con.end();
            }
        }
    });
});

//회원 리스트
app.get("/admin/login/list",function(request,response){
    // console.log(request.query.currentPage);
    var currentPage = 1;
    if(request.query.currentPage != undefined){
        currentPage=request.query.currentPage;
    }
    var sql="select user_id, user_pass, user_name, game_kind from login ";
    sql+=" order by login_id desc";
    var con=mysql.createConnection(conStr);
    con.query(sql,function(err,result,fields){
        if(err){
            console.log("회원리스트 로드 중 에러",err);
        }else{
            // console.log("sql========", result);
            response.render("admin/login/list",{
                param:{
                    currentPage1:currentPage,
                    record:result
                }
            });
        }
        con.end();
    });
});

//회원 삭제
app.post("/admin/login/del",function(request,response){
    console.log("삭제 데이터",request.body);
    var user_id=request.body.user_id;

    var sql="delete from login where user_id=?";
    var con=mysql.createConnection(conStr);
    con.query(sql,[user_id],function(err,fields){
        if(err){
            console.log("회원 삭제 중 에러",err);
        }else{
            response.writeHead(200,{"Content-Type":"text/html;charset=utf-8"});
            response.end(mymodule.getMsgUrl("삭제되었습니다.","/admin/login/list"));
        }
    });
});

//상품영역----------------------------------------------------------------------------------

//상품 등록 폼 요청
app.get("/admin/product/registform",function(request,response){
    // if(request.session.admin==undefined){
    //     response.writeHead(200,{"Content-Type":"text/html;charset=utf-8"});
    //     response.end(mymodule.getMsgBack("관리자 인증이 필요한 서비스 입니다")); 
    // }else{
        var sql="select * from topcategory";
        var con=mysql.createConnection(conStr);
        con.query(sql,function(err,result,fields){
            if(err){
                console.log("상위 카테고리 조회 실패",err);
            }else{
                // console.log(request);
                response.render("admin/product/regist",{
                    record:result,
                });
            }
            con.end();
        })
    // }
});


//상품 등록 요청 처리
app.post("/admin/product/regist", productUpload.single("product_img"), function(request,response){
    var topcategory_id=request.body.topcategory_id;
    var product_name=request.body.product_name;
    var product_price=request.body.product_price;
    var product_detail=request.body.product_detail;
    var product_img=request.file.filename;
    // console.log(request.body);
    var sql="insert into product(topcategory_id,product_name,product_price,product_detail,product_img)";
    sql+=" values(?,?,?,?,?)";
    var con=mysql.createConnection(conStr);
    con.query(sql,[topcategory_id,product_name,product_price,product_detail,product_img],function(err,fields){
        if(err){
            console.log("상품 등록 중 에러",err);
        }else{
            response.redirect("/admin/product/list"); //쿼리문에 result가 없기 때문에 list주소로 보내서 처리!
        }
        con.end();
    });
});

//상품 리스트
app.get("/admin/product/list",function(request,response){
    // console.log(request.query.currentPage);
    var currentPage = 1;
    if(request.query.currentPage != undefined){
        currentPage=request.query.currentPage;
    }
    var sql="select product_id, product_name, product_img, product_price from product";
    sql+=" order by product_id desc";
    var con=mysql.createConnection(conStr);
    con.query(sql,function(err,result,fields){
        if(err){
            console.log("상품 로드 중 에러",err);
        }else{
            // console.log("sql========", result);
            response.render("admin/product/list",{
                param:{
                    currentPage1:currentPage,
                    record:result
                }
            });
        }
        con.end();
    });
});

//상품 상세보기 
app.get("/admin/product/detail",function(request,response){
    // console.log(request.query);
    var product_id=request.query.product_id;

    var sql="select t.top_name,p.product_id, p.product_name, p.product_price, p.product_detail, p.product_img";
    sql+=" from product p left outer join topcategory t";
    sql+=" on t.topcategory_id=p.topcategory_id";
    sql+=" where product_id="+product_id;
    sql+=" group by t.topcategory_id, t.top_name";

    var con=mysql.createConnection(conStr);
    con.query(sql,function(err,result,fields){
        if(err){
            console.log("상품 상세보기 로딩 중 에러",err);
        }else{
            // console.log(result);
            response.render("admin/product/detail",{
                record:result[0]
            });
        }
        con.end();
    }); 
});

//상품 삭제
app.post("/admin/product/del",function(request,response){
    console.log(request.body);
    var product_id=request.body.product_id;
    var product_img=request.body.product_img;
    fs.unlink(__dirname+"/static/upload/product_img/"+product_img,function(err){
        if(err){
            console.log("상품 삭제 중 에러",err);
        }else{
            var sql="delete from product where product_id="+product_id;
            var con=mysql.createConnection(conStr);
            con.query(sql,function(err,fields){
                if(err){
                    console.log("상품 삭제 중 에러",err);
                }else{
                    response.redirect("/admin/product/list");
                }
                con.end();
            });
        }
    });
});

//게임 영역----------------------------------------------------------------------------------

//게임 제품 등록
app.get("/admin/game/registform", function(request, response){
    // if(request.session.admin==undefined){
    //     response.writeHead(200, {"Content-Type":"text/html;charset=utf-8"});
    //     response.end(mymodule.getMsgBack("접근금지야"));
    // }else{
        var sql="select * from game";
        var con=mysql.createConnection(conStr);
        con.query(sql, function(err, result, fields){
            if(err){
                console.log("조회 실패", err);
            }else{
                response.render("admin/game/regist", {
                    record : result /*배열을 ejs에 보내버려 */
                });
            }
            con.end();
        });
    // }
});

//게임 등록 요청 처리
app.post("/admin/game/regist", gameUpload.array("game_img"), function(request, response){
    console.log(request.files);
    var game_name=request.body.game_name;
    var game_detail=request.body.game_detail;

    console.log("첫번째 들어오는 놈 확장자",path.extname(request.files[0].filename));
    console.log("두번째 들어오는 놈 확장자",path.extname(request.files[1].filename));
    if(path.extname(request.files[0].filename) == ".zip"){
        var game_url=request.files[0].filename;
    }else{
        var game_img=request.files[0].filename;
    }
    if(path.extname(request.files[1].filename) == ".zip"){
        var game_url=request.files[1].filename;
    }else{
        var game_img=request.files[1].filename;
    }

    var game_kind=request.body.game_kind;
    var sql="insert into game(game_name, game_detail, game_img, game_kind, game_url)";
    sql+=" values(?,?,?,?,?)";
    var con=mysql.createConnection(conStr);
    
    con.query(sql, [
        game_name,
        game_detail,
        game_img,
        game_kind,
        game_url
        ], function(err, fields){
            if(err){
                console.log("등록 실패", err);
            }else{
                response.redirect("/admin/game/list");
            }
            con.end();
        });
    });

//게임 목록 요청
app.get("/admin/game/list", function(request, response){
    var currentPage=1; //접속시 기본 페이지
    if(request.query.currentPage!=undefined){
        currentPage=request.query.currentPage;
    }
    //탑 카테고리를 선택 안했거나 전체를 선택한 경우

    var sql="select game_id, game_name, game_hit, game_detail";
    sql+=", game_img, game_kind from game";
    sql+=" order by game_id desc";

    var con=mysql.createConnection(conStr);
    con.query(sql, function(err, result, fields){
        if(err){
            console.log("게임 목록 읽기 실패", err);
        }else{
            // console.log(result);

            response.render("admin/game/list", {
                param:{
                    "currentPage" : currentPage,
                    "record" : result
                }
            });
        }
        con.end();
    });
});


//게임 상세보기 요청
app.get("/admin/game/detail", function(request, response){
    //console.log(request.query);
    var game_id=request.query.game_id;
    var con=mysql.createConnection(conStr);

    var sql="select *";
    sql+=" from game where game_id="+game_id;
    //var sql="select * from game where game_id="+game_id;
    
    con.query(sql, function(err, result, fields){
        if(err){
            console.log("정보 표시 에러", err);
        }else{
            console.log(result);
            response.render("admin/game/detail", {
                param:{
                    "record" : result[0]
                }
            });
        }
        con.end();
    });
});

//게임 삭제 요청 처리
app.post("/admin/game/del", function(request, response){
    console.log("몸속에 뭐가ㅣ 들었니", request.body);
    var game_id=request.body.game_id;
    var game_img=request.body.game_img;
    var game_url=request.body.game_url;
    var sql="delete from game where game_id="+game_id;
    var con=mysql.createConnection(conStr);
    con.query(sql, function(err, fields){
        if(err){
            console.log("삭제 실패", err);
        }else{
            fs.unlink(__dirname+"/static/upload/game_img/"+game_img, function(err){
                if(err){
                    console.log("게임이미지 삭제 실패", err)
                }else{
                    console.log("게임 url:============",game_url);
                    fs.unlink(__dirname+"/static/upload/game_img/"+game_url, function(err){
                        if(err){
                            console.log("게임 집파일 삭제 실패", err);
                        }else{
                            response.redirect("/admin/game/list");
                        }
                        con.end();
                    });
                }
            });
        }
    });
});

var server = http.createServer(app);
server.listen(9999, function(){
    console.log("server port is running at 9999....");
});