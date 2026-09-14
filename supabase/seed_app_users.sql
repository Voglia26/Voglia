-- Seed: 1 admin + 12 sellers. Passwords are temporary (scrypt salt:hash).
-- Admin also accepts ADMIN_PASSWORD from env at login time (see lib/auth.ts).
--
-- Credentials (change after first login):
--   admin / admin123  (or your ADMIN_PASSWORD env value)
--   lilly / Lilly-tmp-26
--   linda / Linda-tmp-26
--   gaby / Gaby-tmp-26
--   tanya / Tanya-tmp-26
--   daniela / Daniela-tmp-26
--   valentina / Valentina-tmp-26
--   alejandra / Alejandra-tmp-26
--   ismary / Ismary-tmp-26
--   myra / Myra-tmp-26
--   zindy / Zindy-tmp-26
--   maryeli / Maryeli-tmp-26
--   rachelle / Rachelle-tmp-26

insert into app_users (id, username, password_hash, display_name, role, active) values
  (
    'a0000000-0000-4000-8000-000000000001',
    'admin',
    '9fb46754bc012ef0a18731155bf41a7c:96cef5a6f71ed51454e1757ee7a3180feaea8a9db8266cf492121be8ee50f3aaf067985eae9a2e4c49d6b876d75598c9182bda697797c0bbc09c0c996fe5d2fc',
    'Admin',
    'admin',
    true
  ),
  (
    'a0000000-0000-4000-8000-000000000010',
    'lilly',
    'ac24fd8dbf0cfe59097d0ffab8f117a8:492508f6522773a006f4f3c7c2b07535c125f810990de6047785d30ea4a8b55118441b80a9edd256b02490e56723821eee0498012b0772c2ba1dc2bb40f756c8',
    'Lilly',
    'seller',
    true
  ),
  (
    'a0000000-0000-4000-8000-000000000011',
    'linda',
    '0fb1366b909f07a9f09cfcf27b028430:dc4f8194b894d5f3579bd176978209f6873a349044712012196e209fbfcd44c40bf4cb0741858eb2892d951e319cbf24a8f91bf21afb4897f47ae6e0cd54dcfd',
    'Linda',
    'seller',
    true
  ),
  (
    'a0000000-0000-4000-8000-000000000012',
    'gaby',
    'ccc19583f6cc676162f5f0f2ce70c31f:63c96c25f7cabc62f3bc360c5160b4f65a58f79432db044937d5d168147e91cc8a9b287531690deacf0d5094a9a1c3225d88aefe604758e7fd467c31de4844b3',
    'Gaby',
    'seller',
    true
  ),
  (
    'a0000000-0000-4000-8000-000000000013',
    'tanya',
    '49a1369599ddd6f7789df1c68dd4b21f:ec78cbac681b80bf92dc2f6ccb5596a98a23e3f28a0c69c48a33792bb30ed9e47d386278ea187b18d3aed5a1fc28a2685a9a12c1ca65e82a8bf5138c77b42748',
    'Tanya',
    'seller',
    true
  ),
  (
    'a0000000-0000-4000-8000-000000000014',
    'daniela',
    '674f76b3619b5a4dc2a408cf6ac8d581:618f56c77287933b9adfbd22b69ad3c73774e15ed038927d76a3bcc0a921c5e67a57215eea363c77343e25f75f2d539ac3b40e0801632c1bd05fc31ea4793463',
    'Daniela',
    'seller',
    true
  ),
  (
    'a0000000-0000-4000-8000-000000000015',
    'valentina',
    '033a333e62752103a940a462b1c00b81:1dd9cf361145ffb820a542cf6c00532208d9c60ca40f6243e9281a44078dd87fb7f1335a8ce9d6f9b5248bfd6d134294177648314e8d37312e294c20f5e1caf9',
    'Valentina',
    'seller',
    true
  ),
  (
    'a0000000-0000-4000-8000-000000000016',
    'alejandra',
    '47be63a37bc64b3f59ae822bfa475d35:8fbfb68e9a5de868b8d93dab5442d111f5a120ae2458e4a90f747747dc334b8eb939699da50533b3194b6d001123b8ae004448c5b3df7d4ee3d07272c1aef653',
    'Alejandra',
    'seller',
    true
  ),
  (
    'a0000000-0000-4000-8000-000000000017',
    'ismary',
    'f86e12a5784f4399c9bc9059139c64ad:9d79265c70e075244d0f573035507b1b33c0144e1e6d3523fc1fb01f5e3874b006ac90fd794578009ae0df6aaaab9e3616e890a206598be04811c26e8e410e99',
    'Ismary',
    'seller',
    true
  ),
  (
    'a0000000-0000-4000-8000-000000000018',
    'myra',
    '21d368c6c03da54d87898be1227fddfa:9cf3a22fb0ca854ee547dd851501ae01db98e0f95c5e65305f9d94f96cf82120f3e6d6a1d4992987fbba4ac7683651fb46e4bf47776c59deeb0c0f06a6997e58',
    'Myra',
    'seller',
    true
  ),
  (
    'a0000000-0000-4000-8000-000000000019',
    'zindy',
    '4c8ce688d8bdaf413a5e5e9f493d40f2:fadd136b2a7206a0f05cd4364fa6bd6953293f3e3ed4aff003bde59a0d05e40b75ad5408305f146f36c8eb0a9ababcc648695769cc3312164b548c85252cc879',
    'Zindy',
    'seller',
    true
  ),
  (
    'a0000000-0000-4000-8000-00000000001a',
    'maryeli',
    '78e5b52e75204be011c87ffaf7ef92c5:2118d789eb0f9acf4e7a86c4ee1b74772dbf4a251049a688fb61021eb6c6142637e4031e9f1b797953360b5a78914ce73f441944aad41a6e2d071075d9763ada',
    'Maryeli',
    'seller',
    true
  ),
  (
    'a0000000-0000-4000-8000-00000000001b',
    'rachelle',
    'b75bd878529f6196b0e70c0b0f150de9:2b4ce4f37fca6af009699c2427186f9bf810d2dcebf2646e66f55928a0a35ed6f793224345bbf39b0f5e11836c2888dc81e7d786557f0370378593881a52b2a9',
    'Rachelle',
    'seller',
    true
  )
on conflict (username) do nothing;
