import Crawler from 'crawler';
import colors from 'colors';
import S from 'string';
import Nightmare from 'nightmare';
const nightmare = new Nightmare();

const config = {
  target: 'http://www.asx.com.au/asx/statistics/todayAnns.do'
};
const s = [];
const getPrice = code => {
  return new Promise((resolve, reject) => {

    nightmare
      .goto(`http://www.asx.com.au/asx/research/company.do#!/${code}`)
      .wait('.overview-price.price-up')
      .evaluate(() => {
        const price = document.querySelector('.overview-price.price-up > span').innerHTML;
        for(let i = 0; i < s.length; i ++){
          if(s[i].code == code){
            s[i].price = price;
          }
        }
        return price;
      })
      .end()
      .then(result => {
        resolve({ code, result });
      })
      .catch(error => {
        reject(error);
      });

  });
};
const c = new Crawler({
  maxConnections: 10,
  callback: (error, result, $) => {
    switch(result.uri){
      case config.target:
        $("#content > table").find('tr').each((index, ele) => {
          const $ele = $(ele);
          if($ele.find("td.pricesens").length){
            const stock = {};
            stock.pdf = $ele.find('a').attr('href');
            stock.code = $ele.find('th').text();
            s.push(stock);
            //c.queue(`http://www.asx.com.au/${s.pdf}`);
            getPrice(stock.code).then(({ code, result }) => {
              if(parseFloat(result) < 1){
                s.forEach(v => {
                  if(v.code == code){
                    c.queue(`http://www.asx.com.au/${v.pdf}`);
                  }
                });
              }
            }).catch(err => {
              console.log(`${err}`.red);
            });
          }
        });
        break;
      default:
        const doc = $('input[name="pdfURL"]').attr('value') || $('input[name="pdfURL"]').val();
        for(let i = 0; i < s.length; i ++){
          if(s[i].pdf == result.uri){
            s[i].doc = doc;
          }
        }
        break;
    }
  },
  onDrain: () => {
    for(let i = 0; i < s.length; i ++){
      if(!s[i].doc){
        s.splice(i, 1);
      }
    }
    s.forEach(v => {
      console.log(`${v.code} -- ${v.price} -- ${v.doc}`);
    });
    process.exit();
  }
});
c.queue(config.target);
