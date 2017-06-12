var usersList = [{ key: 1, value: { userid: 1, usename: 'dhanesh' } }
, { key: 1, value: { userid: 2, usename: 'd2' } }];

usersList = usersList.filter(function (i) {
    return i.key !== 1;
});

console.log(usersList);