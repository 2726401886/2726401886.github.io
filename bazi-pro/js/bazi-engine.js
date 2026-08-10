/* ============================================================
   知命八字馆 - 共享八字计算引擎
   ============================================================ */

// ===== 基础数据 =====
var TG = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
var DZ = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
var SX = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];
var WX = ['木','火','土','金','水'];
var WX_NAME = ['木','火','土','金','水'];
var WX_COLOR = ['wood','fire','earth','metal','water'];
var TG_WX = [0,0,1,1,2,2,3,3,4,4];
var DZ_WX = [4,2,0,0,2,1,1,2,3,3,2,4];
var TG_YY = [0,1,0,1,0,1,0,1,0,1]; // 0阳1阴

// 纳音
var NAYIN = [
  '海中金','海中金','炉中火','炉中火','大林木','大林木','路旁土','路旁土','剑锋金','剑锋金',
  '山头火','山头火','涧下水','涧下水','城墙土','城墙土','白蜡金','白蜡金','杨柳木','杨柳木',
  '井泉水','井泉水','屋上土','屋上土','霹雳火','霹雳火','松柏木','松柏木','长流水','长流水',
  '砂石金','砂石金','山下火','山下火','平地木','平地木','壁上土','壁上土','金箔金','金箔金',
  '覆灯火','覆灯火','天河水','天河水','大驿土','大驿土','钗钏金','钗钏金','桑柘木','桑柘木',
  '大溪水','大溪水','沙中土','沙中土','天上火','天上火','石榴木','石榴木','大海水','大海水'
];

// 藏干表 [本气, 中气, 余气] (地支索引)
var CANG_GAN = [
  [9],         // 子: 癸
  [5,9,7],     // 丑: 己癸辛
  [0,2,4],     // 寅: 甲丙戊
  [1],         // 卯: 乙
  [4,1,9],     // 辰: 戊乙癸
  [2,4],       // 巳: 丙戊
  [3,5],       // 午: 丁己
  [5,3,1],     // 未: 己丁乙
  [6,4],       // 申: 庚戊
  [7],         // 酉: 辛
  [4,7,3],     // 戌: 戊辛丁
  [9,0]        // 亥: 壬甲
];

// 十神名称
var TEN_GOD_NAMES = ['比肩','劫财','食神','伤官','偏财','正财','七杀','正官','偏印','正印'];

// 十神计算：日干对比他干
function getTenGod(dayGan, otherGan){
  var dayWx = TG_WX[dayGan], otherWx = TG_WX[otherGan];
  var sameYinYang = TG_YY[dayGan] === TG_YY[otherGan];
  if(dayWx === otherWx){
    return sameYinYang ? 0 : 1; // 比肩/劫财
  }
  // 我生
  var sheng = (dayWx + 1) % 5;
  if(otherWx === sheng){
    return sameYinYang ? 2 : 3; // 食神/伤官
  }
  // 我克
  var ke = (dayWx + 2) % 5;
  if(otherWx === ke){
    return sameYinYang ? 4 : 5; // 偏财/正财
  }
  // 克我
  var keMe = (dayWx + 3) % 5;
  if(otherWx === keMe){
    return sameYinYang ? 6 : 7; // 七杀/正官
  }
  // 生我
  var shengMe = (dayWx + 4) % 5;
  if(otherWx === shengMe){
    return sameYinYang ? 8 : 9; // 偏印/正印
  }
  return 0;
}

// ===== 农历数据 =====
var lunarInfo = [
  0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
  0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
  0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
  0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
  0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
  0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,
  0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
  0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,
  0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
  0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x055c0,0x0ab60,0x096d5,0x092e0,
  0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
  0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
  0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
  0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
  0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,
  0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,
  0x0a2e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,
  0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,
  0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,
  0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,0x0d520
];

function lunarYearDays(y){
  var s=348;for(var i=0x8000;i>0x8;i>>=1)s+=(lunarInfo[y-1900]&i)?1:0;return s+leapDays(y);
}
function leapMonth(y){return lunarInfo[y-1900]&0xf;}
function leapDays(y){if(leapMonth(y))return(lunarInfo[y-1900]&0x10000)?30:29;return 0;}
function monthDays(y,m){return(lunarInfo[y-1900]&(0x10000>>m))?30:29;}

function solar2lunar(year,month,day){
  var base=new Date(1900,0,31);
  var obj=new Date(year,month-1,day);
  var offset=Math.round((obj-base)/86400000);
  var i,temp=0,ly,lm,ld,isLeap=false;
  for(i=1900;i<2101&&offset>0;i++){temp=lunarYearDays(i);offset-=temp;}
  if(offset<0){offset+=temp;i--;}
  ly=i;
  var leap=leapMonth(i);isLeap=false;
  for(i=1;i<13&&offset>0;i++){
    if(leap>0&&i===leap+1&&!isLeap){--i;isLeap=true;temp=leapDays(ly);}
    else{temp=monthDays(ly,i);}
    if(isLeap&&i===leap+1)isLeap=false;
    offset-=temp;
  }
  if(offset===0&&leap>0&&i===leap+1){if(isLeap){isLeap=false;}else{isLeap=true;--i;}}
  if(offset<0){offset+=temp;--i;}
  lm=i;ld=offset+1;
  return{year:ly,month:lm,day:ld,isLeap:isLeap,monthStr:(isLeap?'闰':'')+lm+'月'};
}

// ===== 干支推算 =====
var JIE_QI=[
  {n:'立春',a:'02-04',m:2},{n:'惊蛰',a:'03-05',m:3},{n:'清明',a:'04-04',m:4},
  {n:'立夏',a:'05-05',m:5},{n:'芒种',a:'06-05',m:6},{n:'小暑',a:'07-06',m:7},
  {n:'立秋',a:'08-07',m:8},{n:'白露',a:'09-07',m:9},{n:'寒露',a:'10-08',m:10},
  {n:'立冬',a:'11-07',m:11},{n:'大雪',a:'12-07',m:0},{n:'小寒',a:'01-05',m:1}
];

function getYearGZ(y,m,d){
  var lc=new Date(y,1,4);
  var cd=new Date(y,m-1,d);
  var yy=(cd<lc)?y-1:y;
  var diff=yy-1984;
  return{gan:((diff%10)+10)%10,zhi:((diff%12)+12)%12,name:TG[((diff%10)+10)%10]+DZ[((diff%12)+12)%12]};
}

function getMonthZhi(y,m,d){
  for(var i=JIE_QI.length-1;i>=0;i--){
    var p=JIE_QI[i].a.split('-');
    var jd=new Date(y,parseInt(p[0])-1,parseInt(p[1]));
    if(new Date(y,m-1,d)>=jd)return JIE_QI[i].m;
  }
  return 2;
}

function getMonthGZ(y,m,d){
  var mz=getMonthZhi(y,m,d);
  var yg=getYearGZ(y,m,d).gan;
  var sg=[2,4,6,8,0][yg%5];
  var mg=(sg+(mz-2+12)%12)%10;
  return{gan:mg,zhi:mz,name:TG[mg]+DZ[mz]};
}

function getJDN(y,m,d){
  var a=Math.floor((14-m)/12),yy=y+4800-a,mm=m+12*a-3;
  return d+Math.floor((153*mm+2)/5)+365*yy+Math.floor(yy/4)-Math.floor(yy/100)+Math.floor(yy/400)-32045;
}

function getDayGZ(y,m,d){
  var jdn=getJDN(y,m,d);
  var off=(jdn-11)%60;if(off<0)off+=60;
  return{gan:off%10,zhi:off%12,name:TG[off%10]+DZ[off%12],jiaziIdx:off};
}

function getHourGZ(y,m,d,hour){
  // hour: 0-23
  var dg=getDayGZ(y,m,d);
  var zhiIdx=Math.floor((hour+1)/2)%12;
  // 五鼠遁：甲己日→甲子时起
  var sg=[0,2,4,6,8][dg.gan%5];
  var ganIdx=(sg+zhiIdx)%10;
  return{gan:ganIdx,zhi:zhiIdx,name:TG[ganIdx]+DZ[zhiIdx]};
}

// ===== 藏干十神 =====
function getHiddenStems(zhiIdx){
  return CANG_GAN[zhiIdx] || [];
}

// ===== 五行统计 =====
function countWuxing(pillars){
  var count=[0,0,0,0,0]; // 木火土金水
  for(var i=0;i<pillars.length;i++){
    count[TG_WX[pillars[i].gan]]++;
    count[DZ_WX[pillars[i].zhi]]++;
    var hs=getHiddenStems(pillars[i].zhi);
    for(var j=0;j<hs.length;j++){
      count[TG_WX[hs[j]]]++;
    }
  }
  return count;
}

// ===== 十二长生 =====
var CHANG_SHENG=['长生','沐浴','冠带','临官','帝旺','衰','病','死','墓','绝','胎','养'];
function getLifeStage(dayGan, zhiIdx){
  // 长生起点表
  var startMap={
    0:2,  // 甲→亥
    1:5,  // 乙→午
    2:2,  // 丙→寅
    3:7,  // 丁→酉
    4:2,  // 戊→寅
    5:7,  // 己→酉
    6:5,  // 庚→巳
    7:11, // 辛→子
    8:5,  // 壬→申
    9:11  // 癸→卯
  };
  // 阳干顺行，阴干逆行
  var isYang = TG_YY[dayGan] === 0;
  var start = startMap[dayGan];
  var off;
  if(isYang){
    off = (zhiIdx - start + 12) % 12;
  } else {
    off = (start - zhiIdx + 12) % 12;
  }
  return CHANG_SHENG[off];
}

// ===== 神煞 =====
function getShensha(pillars, dayGan){
  var result = [];
  var dayZhi = pillars[2].zhi;
  var yearZhi = pillars[0].zhi;
  var monthZhi = pillars[1].zhi;

  // 天乙贵人
  var tianyiMap = {0:[1,7],1:[0,6],2:[5,11],3:[4,10],4:[3,9],5:[2,8],6:[1,7],7:[0,6],8:[5,11],9:[4,10]};
  var ty = tianyiMap[dayGan] || [];
  for(var i=0;i<pillars.length;i++){
    if(ty.indexOf(pillars[i].zhi)>=0){
      result.push({name:'天乙贵人', pos:i, type:'auspicious', desc:'逢凶化吉之贵人，一生多得贵人相助'});
      break;
    }
  }

  // 文昌星
  var wenchangMap = {0:3,1:2,2:8,3:7,4:8,5:7,6:5,7:4,8:0,9:0};
  var wc = wenchangMap[dayGan];
  for(var i=0;i<pillars.length;i++){
    if(pillars[i].zhi === wc){
      result.push({name:'文昌星', pos:i, type:'highlight', desc:'主读书天赋、考试运佳，利学术进修'});
      break;
    }
  }

  // 华盖
  var huagaiMap = {0:7,1:4,2:10,3:1,4:7,5:4,6:10,7:1,8:7,9:4};
  // 实际华盖以年支或日支查
  var hgMap = {0:7,1:4,2:10,3:7,4:4,5:1,6:10,7:7,8:4,9:1,10:10,11:1}; // 简化版：三合局最后一支
  var hg = huagaiMap[dayGan];
  // 以年支查华盖
  var nHG = {0:7,1:4,2:10,3:7,4:4,5:1,6:10,7:7,8:4,9:1,10:10,11:1};
  var yearHG = nHG[yearZhi];
  for(var i=0;i<pillars.length;i++){
    if(pillars[i].zhi === yearHG){
      result.push({name:'华盖', pos:i, type:'auspicious', desc:'主聪明孤高，利艺术、宗教、学术'});
      break;
    }
  }

  // 桃花
  var taoMap = {0:8,1:8,2:3,3:3,4:3,5:3,6:8,7:8,8:3,9:3,10:8,11:8}; // 寅午戌→卯, 申子辰→酉, 巳酉丑→午, 亥卯未→子
  var taoMap2 = {0:8,1:3,2:8,3:3,4:8,5:3,6:8,7:3,8:8,9:3,10:8,11:3}; // 修正
  // 正确桃花：三合局中支
  // 申子辰→酉(9), 寅午戌→卯(3), 亥卯未→子(0), 巳酉丑→午(6)
  var realTao = {};
  // 申子辰→酉
  realTao[0]=9; realTao[8]=9; realTao[4]=9;
  // 寅午戌→卯
  realTao[2]=3; realTao[6]=3; realTao[10]=3;
  // 亥卯未→子
  realTao[11]=0; realTao[3]=0; realTao[7]=0;
  // 巳酉丑→午
  realTao[5]=6; realTao[9]=6; realTao[1]=6;
  var tao = realTao[yearZhi];
  if(tao !== undefined){
    for(var i=0;i<pillars.length;i++){
      if(pillars[i].zhi === tao){
        result.push({name:'桃花', pos:i, type:'auspicious', desc:'主人缘佳、异性缘好，利社交演艺'});
        break;
      }
    }
  }

  // 驿马
  var maMap = {0:2,1:11,2:8,3:7,4:8,5:6,6:2,7:0,8:10,9:9,10:2,11:11}; // 简化
  // 正确驿马：三合局第一支的冲
  // 申子辰→寅, 寅午戌→申, 亥卯未→巳, 巳酉丑→亥
  var realMa = {};
  realMa[0]=2; realMa[8]=2; realMa[4]=2;
  realMa[2]=8; realMa[6]=8; realMa[10]=8;
  realMa[11]=5; realMa[3]=5; realMa[7]=5;
  realMa[5]=11; realMa[9]=11; realMa[1]=11;
  var ma = realMa[yearZhi];
  if(ma !== undefined){
    for(var i=0;i<pillars.length;i++){
      if(pillars[i].zhi === ma){
        result.push({name:'驿马', pos:i, type:'auspicious', desc:'主走动奔波，利出差、迁移、海外发展'});
        break;
      }
    }
  }

  // 羊刃
  var yrMap = {0:2,1:3,2:5,3:6,4:5,5:6,6:8,7:9,8:11,9:0};
  var yr = yrMap[dayGan];
  for(var i=0;i<pillars.length;i++){
    if(pillars[i].zhi === yr){
      result.push({name:'羊刃', pos:i, type:'inauspicious', desc:'主刚烈好胜，易受伤破财，需防血光'});
      break;
    }
  }

  // 空亡
  var dayJiazi = pillars[2].jiaziIdx || 0;
  var kongStart = Math.floor(dayJiazi/10)*10;
  // 旬空：甲子旬空戌亥, 甲戌旬空申酉...
  var kongMap = [
    [10,11],[8,9],[6,7],[4,5],[2,3],[0,1]
  ];
  var kong = kongMap[Math.floor(dayJiazi/10)];
  for(var i=0;i<pillars.length;i++){
    if(kong.indexOf(pillars[i].zhi)>=0 && i!==2){
      result.push({name:'空亡', pos:i, type:'inauspicious', desc:'主虚耗不实，缘分淡薄，吉神减力凶神减凶'});
      break;
    }
  }

  // 禄神
  var luMap = {0:2,1:3,2:5,3:6,4:5,5:6,6:8,7:9,8:11,9:0};
  var lu = luMap[dayGan];
  for(var i=0;i<pillars.length;i++){
    if(pillars[i].zhi === lu){
      result.push({name:'禄神', pos:i, type:'auspicious', desc:'主衣食丰足，财源稳定'});
      break;
    }
  }

  return result;
}

// ===== 刑冲合害 =====
var CHONG={0:6,1:7,2:8,3:9,4:10,5:11,6:0,7:1,8:2,9:3,10:4,11:5};
var HAI={0:7,1:6,2:5,3:4,4:3,5:2,6:1,7:0,8:11,9:10,10:9,11:8};
var LIU_HE={0:1,1:0,2:11,11:2,3:10,10:3,4:9,9:4,5:8,8:5,6:7,7:6};
var SAN_HE=[[2,5,8],[0,4,8],[1,5,9],[3,7,11]];
var SAN_HUI=[[2,3,4],[5,6,7],[8,9,10],[11,0,1]];

function getRelations(pillars){
  var rels = [];
  var zhis = pillars.map(function(p){return p.zhi;});
  var labels = ['年柱','月柱','日柱','时柱'];

  // 六冲
  for(var i=0;i<zhis.length;i++){
    for(var j=i+1;j<zhis.length;j++){
      if(CHONG[zhis[i]]===zhis[j]){
        rels.push({type:'chong', label:'六冲', pos1:i, pos2:j, desc:labels[i]+'与'+labels[j]+'相冲（'+DZ[zhis[i]]+DZ[zhis[j]]+'冲），主变动分离'});
      }
    }
  }
  // 六合
  for(var i=0;i<zhis.length;i++){
    for(var j=i+1;j<zhis.length;j++){
      if(LIU_HE[zhis[i]]===zhis[j]){
        rels.push({type:'he', label:'六合', pos1:i, pos2:j, desc:labels[i]+'与'+labels[j]+'相合（'+DZ[zhis[i]]+DZ[zhis[j]]+'合），主人缘和睦'});
      }
    }
  }
  // 三合
  for(var s=0;s<SAN_HE.length;s++){
    var g=SAN_HE[s];
    var found=[];
    for(var i=0;i<zhis.length;i++){if(g.indexOf(zhis[i])>=0)found.push(i);}
    if(found.length>=2){
      rels.push({type:'he', label:'三合', pos1:found[0], pos2:found[1], desc:'地支三合（'+found.map(function(f){return DZ[zhis[f]];}).join('')+'），主贵人助力'});
    }
  }
  // 相害
  for(var i=0;i<zhis.length;i++){
    for(var j=i+1;j<zhis.length;j++){
      if(HAI[zhis[i]]===zhis[j]){
        rels.push({type:'hai', label:'相害', pos1:i, pos2:j, desc:labels[i]+'与'+labels[j]+'相害（'+DZ[zhis[i]]+DZ[zhis[j]]+'害），主暗中不利'});
      }
    }
  }
  // 相刑（简化）
  var xingPairs=[[0,3],[3,0],[1,5],[5,1],[8,5],[5,8],[8,11],[11,8],[5,11],[11,5],[2,3],[3,2]];
  for(var i=0;i<zhis.length;i++){
    for(var j=i+1;j<zhis.length;j++){
      for(var k=0;k<xingPairs.length;k++){
        if(zhis[i]===xingPairs[k][0]&&zhis[j]===xingPairs[k][1]){
          rels.push({type:'xing', label:'相刑', pos1:i, pos2:j, desc:labels[i]+'与'+labels[j]+'相刑（'+DZ[zhis[i]]+DZ[zhis[j]]+'刑），主是非口舌'});
        }
      }
    }
  }

  // 天干五合
  var ganHe=[[0,5],[5,0],[1,6],[6,1],[2,7],[7,2],[3,8],[8,3],[4,9],[9,4]];
  var gans=pillars.map(function(p){return p.gan;});
  for(var i=0;i<gans.length;i++){
    for(var j=i+1;j<gans.length;j++){
      for(var k=0;k<ganHe.length;k++){
        if(gans[i]===ganHe[k][0]&&gans[j]===ganHe[k][1]){
          rels.push({type:'he', label:'天干合', pos1:i, pos2:j, desc:labels[i]+'与'+labels[j]+'天干合（'+TG[gans[i]]+TG[gans[j]]+'合），主有情'});
        }
      }
    }
  }

  return rels;
}

// ===== 旺衰判定 =====
function getProsperity(pillars, dayGan){
  var dayWx = TG_WX[dayGan];
  var monthZhi = pillars[1].zhi;
  var monthWx = DZ_WX[monthZhi];

  // 得令：日主五行与月令同类或月令生扶
  var deLing = (dayWx === monthWx) || (monthWx === (dayWx+4)%5);

  // 统计同类（同五行+生我五行）vs 异类
  var wxCount = countWuxing(pillars);
  var tongLei = wxCount[dayWx] + wxCount[(dayWx+4)%5]; // 同我+生我
  var yiLei = 0;
  for(var i=0;i<5;i++){
    if(i !== dayWx && i !== (dayWx+4)%5) yiLei += wxCount[i];
  }

  var ratio = tongLei / (tongLei + yiLei);
  var level;
  if(ratio > 0.65) level = '身旺';
  else if(ratio > 0.5) level = '中和偏旺';
  else if(ratio > 0.4) level = '中和偏弱';
  else if(ratio > 0.25) level = '身弱';
  else level = '身极弱';

  return {
    deLing: deLing,
    level: level,
    tongLei: tongLei,
    yiLei: yiLei,
    ratio: ratio,
    desc: deLing ? '得令' : '失令'
  };
}

// ===== 用神分析 =====
function getYongshen(pillars, dayGan){
  var prop = getProsperity(pillars, dayGan);
  var dayWx = TG_WX[dayGan];
  var yongshen, xishen, jishen;

  if(prop.level === '身旺' || prop.level === '中和偏旺'){
    // 身旺用克泄耗
    yongshen = '克（官杀）'; // 克我
    xishen = '泄（食伤）'; // 我生
    jishen = '生（印星）'; // 生我
  } else {
    // 身弱用生扶
    yongshen = '生（印星）'; // 生我
    xishen = '同（比劫）'; // 同我
    jishen = '克（官杀）'; // 克我
  }

  var jiWx = (dayWx + 4) % 5; // 生我
  var keWx = (dayWx + 3) % 5; // 克我
  var shengWx = (dayWx + 1) % 5; // 我生

  var yongWx = (prop.level.indexOf('旺') >= 0) ? keWx : jiWx;

  return {
    yongshen: yongshen,
    xishen: xishen,
    jishen: jishen,
    choushen: '仇神（克用神之五行）',
    jiWx: WX[yongWx],
    jiColor: ['#4a8a4a','#c44d4d','#b8860b','#7a7a7a','#4a6fa5'][yongWx],
    jiDirection: getWxDirection(yongWx),
    jiProfession: getWxProfession(yongWx)
  };
}

function getWxDirection(wx){
  return ['东方','南方','中央','西方','北方'][wx];
}

function getWxProfession(wx){
  var prof = {
    0: '教育、文化、出版、服装、农业、林业',
    1: '电子、电力、能源、餐饮、照明、传媒',
    2: '房地产、建筑、陶瓷、矿业、物业管理',
    3: '金融、机械、五金、汽车、珠宝',
    4: '航运、水产、旅游、物流、清洁'
  };
  return prof[wx] || '';
}

// ===== 大运排盘 =====
function getDaYun(pillars, gender, birthYear, birthMonth, birthDay){
  var yearGZ = pillars[0];
  var monthGZ = pillars[1];
  // 阳年男/阴年女→顺排，阴年男/阳年女→逆排
  var isYangYear = TG_YY[yearGZ.gan] === 0;
  var isMale = gender === 'male';
  var forward = (isYangYear && isMale) || (!isYangYear && !isMale);

  var monthJiazi = monthGZ.gan * 10 + ((monthGZ.gan % 2 === 0) ? monthGZ.zhi : (monthGZ.zhi + 2) % 12);
  // 简化：直接用月柱索引
  // 找月柱在60甲子中的位置
  var monthIdx = -1;
  for(var i=0;i<60;i++){
    if(i%10===monthGZ.gan && i%12===monthGZ.zhi){monthIdx=i;break;}
  }
  if(monthIdx < 0) monthIdx = 0;

  // 起运岁数（简化估算：3岁起运）
  var startAge = 3; // 简化

  var dayuns = [];
  for(var i=1;i<=8;i++){
    var idx;
    if(forward){
      idx = (monthIdx + i) % 60;
    } else {
      idx = (monthIdx - i + 60) % 60;
    }
    var gan = idx % 10;
    var zhi = idx % 12;
    var tg = getTenGod(pillars[2].gan, gan);
    var startA = startAge + (i-1) * 10;
    var endA = startA + 9;
    var startY = birthYear + startA;

    dayuns.push({
      gan: gan, zhi: zhi,
      name: TG[gan]+DZ[zhi],
      tenGod: TEN_GOD_NAMES[tg],
      tenGodIdx: tg,
      startAge: startA,
      endAge: endA,
      startYear: startY,
      endYear: startY + 9,
      nayin: NAYIN[idx]
    });
  }

  return dayuns;
}

// ===== 流年排盘 =====
function getLiuNian(pillars, birthYear, count){
  var liunians = [];
  var currentYear = new Date().getFullYear();
  var startYear = currentYear - 2;
  var dayGan = pillars[2].gan;

  for(var y=0;y<count;y++){
    var year = startYear + y;
    var age = year - birthYear;
    // 流年干支
    var diff = year - 1984;
    var gan = ((diff%10)+10)%10;
    var zhi = ((diff%12)+12)%12;
    var tg = getTenGod(dayGan, gan);

    // 判断是否犯太岁
    var yearZhi = pillars[0].zhi;
    var clash = (CHONG[zhi] === yearZhi); // 冲太岁
    var same = (zhi === yearZhi); // 值太岁
    var harm = (HAI[zhi] === yearZhi);

    var tag = '';
    if(same) tag = '值太岁';
    else if(clash) tag = '冲太岁';
    else if(harm) tag = '害太岁';

    liunians.push({
      year: year,
      age: age,
      gan: gan,
      zhi: zhi,
      name: TG[gan]+DZ[zhi],
      tenGod: TEN_GOD_NAMES[tg],
      tenGodIdx: tg,
      tag: tag,
      isCurrent: year === currentYear,
      nayin: NAYIN[(gan*0+zhi*0)] // will fix below
    });
    // Fix nayin
    var jzIdx = -1;
    for(var k=0;k<60;k++){if(k%10===gan&&k%12===zhi){jzIdx=k;break;}}
    liunians[liunians.length-1].nayin = NAYIN[jzIdx] || '';
  }

  return liunians;
}

// ===== 学业解析 =====
function getStudyAnalysis(pillars, dayGan, shensha){
  var dayWx = TG_WX[dayGan];
  var wxCount = countWuxing(pillars);
  var yinXing = wxCount[(dayWx+4)%5]; // 印星五行数量（生我）
  var shiShang = wxCount[(dayWx+1)%5]; // 食伤五行数量（我生）
  var caiXing = wxCount[(dayWx+2)%5]; // 财星五行数量（我克）

  var hasWenchang = shensha.some(function(s){return s.name==='文昌星';});
  var prop = getProsperity(pillars, dayGan);

  var talent = '';
  var weakness = '';
  var subject = '';
  var diploma = '';
  var examLuck = '';

  // 天赋分析
  if(yinXing >= 3 || (yinXing >= 2 && hasWenchang)){
    talent = '印星旺盛，天生学习能力强，记忆力超群，适合静心钻研。有较强的学术深造潜力，考研、读博运势佳。文昌星加持，逢考易超常发挥。';
    weakness = '过于依赖书本知识，实践动手能力需加强。有时想法过于理想化，需注重落地执行。';
    subject = '适合文科、理论研究、医学、法学、教育学等需要长期积累的学科方向。';
    diploma = '高学历格局（硕博），学术道路上易得师长提携。';
  } else if(shiShang >= 3){
    talent = '食伤旺盛，悟性极高，举一反三能力强，思维活跃富有创造力。不拘泥于课本，擅长举一反三、触类旁通。';
    weakness = '兴趣广泛但容易三分钟热度，需培养专注力和耐心。考试容易因粗心失分。';
    subject = '适合艺术、设计、创意产业、传媒、文学创作等需要创新思维的领域。';
    diploma = '本科或以上，实践能力突出，但学历非唯一出路，才华是最大资本。';
  } else if(caiXing >= 3){
    talent = '财星旺而不喜死读书，社会学习能力强，擅长经商实操和人际交往。实践出真知，在商业环境中成长迅速。';
    weakness = '对纯理论学习兴趣不高，传统应试教育下可能学历平平。需在实践中学以致用。';
    subject = '适合商科、金融、管理、市场营销等实操型专业方向。';
    diploma = '专科或本科，但社会大学才是主战场，创业能力远超学历价值。';
  } else if(yinXing >= 2){
    talent = '印星适中，学习基础扎实，能按部就班完成学业。有不错的理解力和记忆力，适合稳步上升的求学路径。';
    weakness = '缺乏突破性思维，需在外部激励下才能发挥最大潜力。';
    subject = '适合理工科、师范、公务员等稳定型方向。';
    diploma = '本科平稳，努力可达硕士水平。';
  } else {
    talent = '五行较为均衡，学习能力中等偏上，需要后天的勤奋和正确方法来弥补先天不足。持之以恒是关键。';
    weakness = '无明显学业优势，需要找到适合自己的学习方法和节奏。';
    subject = '根据个人兴趣选择，工科、商科均可，重在坚持。';
    diploma = '本科务实，重在个人努力和方向选择。';
  }

  // 考试运
  if(hasWenchang){
    examLuck = '有文昌星加持，逢考运佳，尤其利语文、文学类科目。考试年逢印星流年更易超常发挥。';
  } else if(yinXing >= 2){
    examLuck = '印星有力，考试发挥稳定，不易发挥失常。逢印星流年（生我之五行年份）考试运最佳。';
  } else if(shiShang >= 3){
    examLuck = '食伤旺，思维敏捷但容易粗心，需注意考试细节。逢食伤流年思维最活跃，适合创意类考试。';
  } else {
    examLuck = '考试运平稳，无大起大落。建议在比劫流年（同类五行年份）考试，状态最佳。';
  }

  // 升学关键年份
  var keyYears = [];
  var dayuns = getDaYun(pillars, 'male', 2000, 1, 1); // 简化
  // 16-25岁走印运→利高考考研
  // 这里简化处理
  keyYears.push('16-25岁：学业关键期，印星大运加持，高考考研运势佳');
  keyYears.push('28岁左右：适合考取职业证书、职称评定');
  keyYears.push('35岁后：终身学习阶段，适合进修EMBA或转型学习');

  return {
    talent: talent,
    weakness: weakness,
    subject: subject,
    diploma: diploma,
    examLuck: examLuck,
    keyYears: keyYears,
    yinXing: yinXing,
    shiShang: shiShang,
    caiXing: caiXing,
    hasWenchang: hasWenchang
  };
}

// ===== 性格事业感情分析 =====
function getLifeAnalysis(pillars, dayGan){
  var dayWx = TG_WX[dayGan];
  var prop = getProsperity(pillars, dayGan);
  var wxName = WX[dayWx];

  var personality = '';
  var career = '';
  var marriage = '';
  var health = '';

  // 日主五行性格
  var wxPersonality = {
    0: '木命人：仁慈正直，有上进心，做事有计划。但有时固执己见，不善变通。',
    1: '火命人：热情开朗，礼节周到，思维敏捷。但性急冲动，做事容易虎头蛇尾。',
    2: '土命人：诚实守信，稳重踏实，重信誉。但有时保守固执，不善表达。',
    3: '金命人：刚毅果断，重义气，做事有魄力。但有时过于刚硬，不够圆融。',
    4: '水命人：聪明机智，灵活多变，善于交际。但有时优柔寡断，缺乏主见。'
  };
  personality = wxPersonality[dayWx];

  // 身旺身弱补充
  if(prop.level.indexOf('旺') >= 0){
    personality += '命局偏旺，个性较强，有主见，做事有魄力，但需注意不可过于强势。';
  } else {
    personality += '命局偏弱，性格温和，善于合作，但需增强自信心和决断力。';
  }

  // 事业方向
  var ys = getYongshen(pillars, dayGan);
  career = '适合行业：' + ys.jiProfession + '。吉利方位：' + ys.jiDirection + '。';
  if(prop.level.indexOf('旺') >= 0){
    career += '身旺能担财官，适合创业经商或担任管理岗位。打工适合技术骨干、项目负责人。';
  } else {
    career += '身弱宜稳扎稳打，适合在大平台发展，借助团队力量。打工优于创业，贵人在长辈或上司。';
  }

  // 感情婚姻
  var caiWx = (dayWx + 2) % 5;
  var caiCount = countWuxing(pillars)[caiWx];
  if(caiCount >= 2){
    marriage = '财星明显，异性缘佳，正缘出现在20-28岁区间。配偶特征：务实能干，善于理财。婚姻中需注意财务管理，避免因财生隙。';
  } else if(caiCount === 1){
    marriage = '财星适中，感情发展平稳，正缘在25-30岁。配偶特征：温和体贴，注重家庭。婚姻和睦，相互扶持。';
  } else {
    marriage = '财星不显，异性缘需主动争取，正缘稍晚在28-35岁。配偶特征：性格互补，可能经人介绍认识。婚姻需用心经营。';
  }

  // 健康预警
  var healthMap = {
    0: '木对应肝胆，需注意肝胆健康，少熬夜，保持情绪舒畅。易患：肝胆疾病、眼疾、筋骨问题。',
    1: '火对应心脏，需注意心血管健康，少食辛辣，保持心态平和。易患：心脏、血压、眼部问题。',
    2: '土对应脾胃，需注意消化系统，饮食规律，少食生冷。易患：胃肠疾病、皮肤病。',
    3: '金对应肺，需注意呼吸系统，远离烟尘，注意保暖。易患：肺病、气管炎、皮肤过敏。',
    4: '水对应肾，需注意肾脏泌尿系统，适当运动，避免久坐。易患：肾虚、泌尿系统问题。'
  };
  health = healthMap[dayWx];

  // 五行缺失预警
  var wxCount = countWuxing(pillars);
  var minWx = 0, minVal = 99;
  for(var i=0;i<5;i++){
    if(wxCount[i] < minVal){minVal=wxCount[i];minWx=i;}
  }
  if(minVal === 0){
    health += '五行缺' + WX[minWx] + '，对应器官需额外保养。';
  }

  return {
    personality: personality,
    career: career,
    marriage: marriage,
    health: health
  };
}

// ===== 格局判定 =====
function getPattern(pillars, dayGan){
  var monthZhi = pillars[1].zhi;
  var hidden = getHiddenStems(monthZhi);
  var monthGan = hidden[0]; // 月令本气天干
  var tg = getTenGod(dayGan, monthGan);

  var patterns = {
    0: {name:'建禄格', desc:'日主临官在月令，主自身能力强，白手起家之命'},
    1: {name:'月劫格', desc:'日主帝旺在月令，主竞争意识强，需善用精力'},
    2: {name:'食神格', desc:'月令食神，主有福有寿，衣食无忧，才华出众'},
    3: {name:'伤官格', desc:'月令伤官，主聪明过人但傲气，需佩印制之'},
    4: {name:'偏财格', desc:'月令偏财，主财源广进但不稳定，适合经商'},
    5: {name:'正财格', desc:'月令正财，主财源稳定，勤俭持家之命'},
    6: {name:'七杀格（偏官格）', desc:'月令七杀，主有权威有魄力，但需制化方为吉'},
    7: {name:'正官格', desc:'月令正官，主品行端正，适合仕途公职'},
    8: {name:'偏印格（枭神格）', desc:'月令偏印，主聪明孤僻，适合专业技术'},
    9: {name:'正印格', desc:'月令正印，主学业有成，文采出众，心地善良'}
  };

  var p = patterns[tg] || {name:'无明确格局', desc:'月令藏干不显，以五行旺衰论命'};
  return p;
}

// ===== 主计算函数 =====
function calculateBazi(year, month, day, hour, gender, isLunar){
  // 如果是农历，先转公历
  if(isLunar){
    var solar = lunar2solar(year, month, day);
    if(solar){
      year = solar.year;
      month = solar.month;
      day = solar.day;
    }
  }

  var yearGZ = getYearGZ(year, month, day);
  var monthGZ = getMonthGZ(year, month, day);
  var dayGZ = getDayGZ(year, month, day);
  var hourGZ = getHourGZ(year, month, day, hour);

  var pillars = [
    {gan:yearGZ.gan, zhi:yearGZ.zhi, name:yearGZ.name, jiaziIdx: getJiaZiIdx(yearGZ.gan, yearGZ.zhi)},
    {gan:monthGZ.gan, zhi:monthGZ.zhi, name:monthGZ.name, jiaziIdx: getJiaZiIdx(monthGZ.gan, monthGZ.zhi)},
    {gan:dayGZ.gan, zhi:dayGZ.zhi, name:dayGZ.name, jiaziIdx: getJiaZiIdx(dayGZ.gan, dayGZ.zhi)},
    {gan:hourGZ.gan, zhi:hourGZ.zhi, name:hourGZ.name, jiaziIdx: getJiaZiIdx(hourGZ.gan, hourGZ.zhi)}
  ];

  var dayGan = dayGZ.gan;
  var lunar = solar2lunar(year, month, day);
  var wxCount = countWuxing(pillars);
  var prop = getProsperity(pillars, dayGan);
  var shensha = getShensha(pillars, dayGan);
  var relations = getRelations(pillars);
  var pattern = getPattern(pillars, dayGan);
  var yongshen = getYongshen(pillars, dayGan);
  var dayuns = getDaYun(pillars, gender, year, month, day);
  var liunians = getLiuNian(pillars, year, 30);
  var study = getStudyAnalysis(pillars, dayGan, shensha);
  var life = getLifeAnalysis(pillars, dayGan);

  // 十神
  var tenGods = pillars.map(function(p){
    return TEN_GOD_NAMES[getTenGod(dayGan, p.gan)];
  });

  // 藏干十神
  var hiddenStems = pillars.map(function(p){
    var hs = getHiddenStems(p.zhi);
    return hs.map(function(g){
      return {gan: g, name: TG[g], tenGod: TEN_GOD_NAMES[getTenGod(dayGan, g)]};
    });
  });

  // 十二长生
  var lifeStages = pillars.map(function(p){
    return getLifeStage(dayGan, p.zhi);
  });

  // 纳音
  var nayins = pillars.map(function(p){
    return NAYIN[p.jiaziIdx] || '';
  });

  // 生肖
  var shengxiao = SX[yearGZ.zhi];

  return {
    pillars: pillars,
    tenGods: tenGods,
    hiddenStems: hiddenStems,
    lifeStages: lifeStages,
    nayins: nayins,
    dayGan: dayGan,
    dayWx: TG_WX[dayGan],
    lunar: lunar,
    wxCount: wxCount,
    prop: prop,
    shensha: shensha,
    relations: relations,
    pattern: pattern,
    yongshen: yongshen,
    dayuns: dayuns,
    liunians: liunians,
    study: study,
    life: life,
    shengxiao: shengxiao,
    birthInfo: {year:year, month:month, day:day, hour:hour, gender:gender}
  };
}

function getJiaZiIdx(gan, zhi){
  for(var i=0;i<60;i++){
    if(i%10===gan && i%12===zhi) return i;
  }
  return 0;
}

// 农历转公历（简化版，遍历查找）
function lunar2solar(ly, lm, ld){
  for(var y=ly-1;y<=ly+1;y++){
    for(var m=1;m<=12;m++){
      for(var d=1;d<=31;d++){
        try{
          var test = solar2lunar(y,m,d);
          if(test.year===ly && test.month===lm && test.day===ld && !test.isLeap){
            return {year:y, month:m, day:d};
          }
        }catch(e){}
      }
    }
  }
  return null;
}

// ===== 工具函数 =====
function formatDate(d){
  return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);
}

var SHI_CHEN = ['子时(23-1)','丑时(1-3)','寅时(3-5)','卯时(5-7)','辰时(7-9)','巳时(9-11)','午时(11-13)','未时(13-15)','申时(15-17)','酉时(17-19)','戌时(19-21)','亥时(21-23)'];

console.log('[知命八字馆] 计算引擎加载完成 v1.0');
