let input = { value: "13.000" };
let value = input.value.replace(/[^,\d]/g, '').toString();
let split = value.split(',');
let sisa = split[0].length % 3;
let rupiah = split[0].substr(0, sisa);
let ribuan = split[0].substr(sisa).match(/\d{3}/gi);
if (ribuan) {
    let separator = sisa ? '.' : '';
    rupiah += separator + ribuan.join('.');
}
rupiah = split[1] != undefined ? rupiah + ',' + split[1] : rupiah;
input.value = rupiah ? 'Rp ' + rupiah : '';
console.log("formatRupiah output:", input.value);

// API parsing
let priceStr = input.value;
let numericPrice = priceStr ? parseFloat(priceStr.toString().replace(/[^0-9,-]+/g,"").replace(',', '.')) : null;
console.log("API output:", numericPrice);

// Load to form again
let itemPrice = numericPrice.toString();
input = { value: itemPrice };
value = input.value.replace(/[^,\d]/g, '').toString();
split = value.split(',');
sisa = split[0].length % 3;
rupiah = split[0].substr(0, sisa);
ribuan = split[0].substr(sisa).match(/\d{3}/gi);
if (ribuan) {
    let separator = sisa ? '.' : '';
    rupiah += separator + ribuan.join('.');
}
rupiah = split[1] != undefined ? rupiah + ',' + split[1] : rupiah;
input.value = rupiah ? 'Rp ' + rupiah : '';
console.log("formatRupiah on load:", input.value);
