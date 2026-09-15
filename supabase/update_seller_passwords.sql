-- Update seller temporary passwords to username+26 (scrypt salt:hash).
-- Does NOT change admin.
-- Credentials after running:
--   lilly / lilly26
--   linda / linda26
--   gaby / gaby26
--   tanya / tanya26
--   daniela / daniela26
--   valentina / valentina26
--   alejandra / alejandra26
--   ismary / ismary26
--   myra / myra26
--   zindy / zindy26
--   maryeli / maryeli26
--   rachelle / rachelle26

update app_users
  set password_hash = '19adc1d697cd0847b88a37e3aec1c749:3745afdfb5d38036b77bfe1a6c61c97074e605ec6e17c41a962474861927fbc7b012726da2c800e91575887440b7edd205db060d98eba6a4d22a8dcbdca089ab'
  where username = 'lilly' and role = 'seller';

update app_users
  set password_hash = '1807c6053e8d85c6c71ce00935c5adc6:17912f0ab9c708edb09c8992790eacb9e3634b4ea1f017f634f75e4330734347a1c39d6c416863d016a933bea90ce0e262d91099594bb3b096b41bd705afa8b1'
  where username = 'linda' and role = 'seller';

update app_users
  set password_hash = 'd7bc4693a866b6c0a84af14a3e6c9ec1:8b8da84cc7b1da7d60d7ce2be102b1578740d32c7d3ba15ee447a464215961b224ba04353413aa9a79b8a04ef5f13c1ea5104385731f8ab25e5ad174794e39ea'
  where username = 'gaby' and role = 'seller';

update app_users
  set password_hash = '6b548533d04c4bbaee1de324c4de9738:6f8edec1e03c215daa3bd622b9e6d1c9ba8cbc77b519c2c597b22b4f12187cf4b29df55c8fc9e412ce08aaa5421716ae95ad92da7dbb557c9e1329fd5907a01c'
  where username = 'tanya' and role = 'seller';

update app_users
  set password_hash = '04a0d281902caf393ecdc2ad8787508d:0996e17110136896ec9bec421dc555821009bada30fcb0d5d02d25dbec7d8871011c4cbfd201e29de214cedc1c2ad88e24cfa2926925b0f79b63b837c2d1e6d0'
  where username = 'daniela' and role = 'seller';

update app_users
  set password_hash = 'ce51dbffb7ab6bdc2b39a0795c981c96:fad8e8ed7ebe8f24a9cba0592680f27a8574bda795bfa29eea25d7050f0cd6a3bd056a03d86c1108981aa5f712b5df14fb522eba07f9e4b1ad4739d6e9adbfac'
  where username = 'valentina' and role = 'seller';

update app_users
  set password_hash = 'cf8fe37b26298409cd150f8834ad0b7a:59a53d3d450dd314d75229f8e93f408587e641240865d223195991b4fa16b61e2c8fbf68bedf9388986d069bd4aee13aba642512ea8eea1390f2643db1764744'
  where username = 'alejandra' and role = 'seller';

update app_users
  set password_hash = '59de08e782db7bf7df7bf9d7989b91b3:0cc8da7661d5cf3533fa32ac7b64b34e3081b0dd776f8c1789aa209f1ae3b607a68bae8ce9a40abedccc3e2daa0bdf1de3e156e70f24e7a779fd9e44e99e6416'
  where username = 'ismary' and role = 'seller';

update app_users
  set password_hash = 'e8a4cb85d4170d65d5e3b996277565d8:a61a07613f4f0290c9ae2678594f976ed1c8d3da81d1b3732cab29ff3e30fcec3b305aa36b9ed3a7da56ddee7ea37b549c235d53a2b6626d02f454821629e2df'
  where username = 'myra' and role = 'seller';

update app_users
  set password_hash = '9488c5d9ea7b66f2a7273e4110ba975d:d33c7d9b433539a649111ff6798ff786ace7d99ca57a7e7072087560950b708cfe3ee256805055c7d28f35807e34584a171d071eb731f15f8e413da38cfaeee7'
  where username = 'zindy' and role = 'seller';

update app_users
  set password_hash = '1704ce11b0df9d47e77c33257006d529:157740018369a178342f55a68015f109d827c90611059f20aedad1439093acd1d72f2d83ee6ea10ec0d705383813ca4355ee3e838bf096ac0f2dedd330d62c88'
  where username = 'maryeli' and role = 'seller';

update app_users
  set password_hash = '21e54a810c1e5c359c39e592ff0f45ea:445eef61bd9076287930fb20bf5049e42b85f6d045985813f654966652437f2cf7d459c1c2a33fc397e81cc1b6e0df873a8539b1227ad5e05ffc3acf7bf6f8eb'
  where username = 'rachelle' and role = 'seller';

