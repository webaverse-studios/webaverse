import * as THREE from 'three';
import React, {useState, useEffect, useRef, useContext, createContext, Fragment} from 'react';
import classnames from 'classnames';

import '../../../styles/globals.css';
import styles from './TitleScreen.module.css';

// let appStarted = false;

import {
    ZineRenderer,
} from 'zine/zine-renderer.js';
import {
    ZineCameraManager,
} from '../../../zine-runtime/zine-camera.js';
import {
    ZineStoryboard,
} from 'zine/zine-format.js';
// import {
//     zbdecode,
// } from 'zine/encoding.js';
import {
    compileScene,
} from '../../../zine-runtime/zine-remote-compiler.js';
import {
    PathMesh,
} from 'zine-aux/meshes/path-mesh.js';

//

const assetsBaseUrl = `https://webaverse.github.io/gwe-assets`;
const imgNames = [
    // 'DALL·E 2022-11-21 20.33.19 - video game, street view, anime, high resolution, high detail, bright colors.png',
    // 'DALL·E 2022-11-21 20.39.15 - video game, street view, anime, high resolution, high detail, bright colors, alley.png',
    // 'DALL·E 2022-11-21 20.39.30 - video game, street view, anime, high resolution, high detail, bright colors, alley.png',
    // 'DALL·E 2022-11-21 20.39.40 - video game, street view, anime, high resolution, high detail, bright colors, alley.png',
    // 'DALL·E 2022-11-21 23.22.22 - video game, street view, anime, high resolution, high detail, bright colors, road.png',
    // 'DALL·E 2022-11-21 23.22.32 - video game, street view, anime, high resolution, high detail, bright colors, road.png',
    // 'DALL·E 2022-11-21 23.25.30 - video game, anime, high resolution, high detail, bright colors, shop interior, wizard, potions, large open space.png',
    // 'DALL·E 2022-11-21 23.31.51 - video game, anime, high resolution, high detail, bright colors, large shop interior, wizard, potions, large open space.png',
    // 'DALL·E 2022-11-21 23.55.14 - video game, anime, high resolution, very high detail, bright colors, large shop interior, wizard, potions, large open space, style of Makoto Shinkai.png',
    // 'DALL·E 2022-11-21 23.56.28 - video game, anime, high resolution, very high detail, bright colors, large shop interior, wizard, potions, large open space, style of Makoto Shinkai.png',
    // 'DALL·E 2022-11-22 00.11.53 - video game, anime, high resolution, very high detail, bright colors, street view, style of Makoto Shinkai.png',
    'Kalila_A_bright_high_resolution_empty_open_space_anime_shop_ais_4aa54090-b9a2-4f57-b5be-a0baa9ebb3f0.png',
    'Kalila_A_bright_high_resolution_empty_open_space_anime_shop_ais_771bbbbf-e7b4-4fad-903a-db35b926b225.png',
    'Kalila_A_bright_high_resolution_empty_open_space_anime_shop_ais_cc5eabf4-0d33-4e48-bfce-3c1632356d8e.png',
    'Kalila_A_highly_detailed_anime_city_street_with_shops._32901a0c-503c-409c-acec-f689c0997333.png',
    'Kalila_A_highly_detailed_anime_city_street_with_shops._d41d508a-fe1b-406d-b866-9caaafc49a58.png',
    'Kalila_An_anime_bright_forest_stone_paved_path_very_high_resolu_82218014-7378-400f-a9a1-f5d0d60b39c1.png',
    'Kalila_An_anime_bright_forest_stone_paved_path_very_high_resolu_845a9f0d-0073-460c-bbba-c1e6ae84fd4c.png',
    'Kalila_An_anime_bright_forest_stone_paved_path_very_high_resolu_b925c634-a1a5-4623-9acb-63d397effd1c.png',
    'Kalila_An_anime_bright_forest_stone_paved_path_very_high_resolu_e81e5455-a398-4046-bdc8-77114b10ae83.png',
    'Kalila_An_anime_bright_forest_stone_paved_path_very_high_resolu_f098f914-856c-4885-b26c-9322b69d79a7.png',
    'Kalila_An_anime_bright_high_resolution_empty_alley_between_buil_00afe791-80e2-4e5e-88df-06da12d8cd38.png',
    'Kalila_An_anime_bright_high_resolution_empty_alley_between_buil_2aec2c0c-4fa5-4310-b84e-76788a7d8883.png',
    'Kalila_An_anime_bright_high_resolution_empty_alley_between_buil_d1fd1217-4a33-42ca-ab71-98ec73e1be7f.png',
    'Kalila_An_anime_bright_high_resolution_empty_alley_between_buil_feac474b-d185-4b15-961f-0bf47b48695c.png',
    'Kalila_An_anime_bright_high_resolution_empty_forest_with_magic__07f90f7b-96c2-4848-9f24-e6c5e899945e.png',
    'Kalila_An_anime_bright_high_resolution_empty_forest_with_magic__394cf78e-a9cb-4238-b2e7-7575942a0154.png',
    'Kalila_An_anime_bright_high_resolution_empty_forest_with_magic__66082dfe-ce27-4de6-90cf-097af2be2373.png',
    'Kalila_An_anime_bright_high_resolution_empty_forest_with_magic__76d82495-e91a-4b53-b150-39e31839752d.png',
    'Kalila_An_anime_bright_high_resolution_empty_forest_with_magic__8a674911-0b16-43f6-97b9-fffe598f7697.png',
    'Kalila_An_anime_bright_high_resolution_empty_forest_with_magic__8d08437e-61f9-49fe-8098-29a017380990.png',
    'Kalila_An_anime_bright_high_resolution_empty_forest_with_magic__ae1578ad-3d9f-4b31-950d-e879800ff985.png',
    'Kalila_An_anime_bright_high_resolution_empty_forest_with_magic__b4ca48a7-378d-49de-a574-02b929e03f9f.png',
    'Kalila_An_anime_bright_high_resolution_empty_forest_with_open_s_18e524c9-1602-4410-91d2-a93fb2235c7b.png',
    'Kalila_An_anime_bright_high_resolution_empty_forest_with_open_s_640a8d8c-df5a-4e49-94aa-46b249e5706a.png',
    'Kalila_An_anime_bright_high_resolution_empty_forest_with_open_s_738f1a80-5588-4bb8-885f-32c86783a71a.png',
    'Kalila_An_anime_bright_high_resolution_empty_forest_with_open_s_8ef1de2c-3706-4632-bf0e-05e846cc3513.png',
    'Kalila_An_anime_bright_high_resolution_empty_forest_with_open_s_9fa66c57-2568-4dc2-bf60-a972aa05192c.png',
    'Kalila_An_anime_bright_high_resolution_empty_forest_with_open_s_bb2d96b3-a96f-42ee-8498-db1312f4d992.png',
    'Kalila_An_anime_bright_high_resolution_empty_forest_with_open_s_c6e31546-2d80-4345-9ca5-608d5c4c6715.png',
    'Kalila_An_anime_bright_high_resolution_empty_forest_with_open_s_d87f6ae6-4d09-4e32-be17-4f0f74747f46.png',
    'Kalila_An_anime_bright_high_resolution_empty_forest_with_ruins__1cbe5ada-3958-4592-826d-b293c0f5e380.png',
    'Kalila_An_anime_bright_high_resolution_empty_forest_with_ruins__8938422c-4b1e-40e3-88e9-24315f91a2be.png',
    'Kalila_An_anime_bright_high_resolution_empty_forest_with_ruins__8d490633-a87c-4391-a5de-50a22764961f.png',
    'Kalila_An_anime_bright_high_resolution_empty_forest_with_ruins__c512b81f-4b30-4a33-aec2-8d846512f90c.png',
    'Kalila_An_anime_bright_high_resolution_empty_forest_with_ruins__f0be313b-b103-4b76-8c1b-68edd6f8ce96.png',
    'Kalila_An_anime_bright_high_resolution_empty_forest_with_ruins__ff700a2b-3a26-420f-9fef-ad5961be011e.png',
    'Kalila_An_anime_bright_high_resolution_empty_library._34ac44f9-99af-4afb-82b5-f6b14d16b169.png',
    'Kalila_An_anime_bright_high_resolution_empty_library._80e3dfbc-ccda-48c7-b297-849ccc0dd76a.png',
    'Kalila_An_anime_bright_high_resolution_empty_library._8807d722-a745-48b8-a446-41687b472972.png',
    'Kalila_An_anime_bright_high_resolution_empty_open_space_library_35abf20a-b894-4de5-ad46-6568ad9fb2f9.png',
    'Kalila_An_anime_bright_high_resolution_empty_street_with_houses_39a70a44-ccfa-47d4-b3a8-46d9558b1486.png',
    'Kalila_An_anime_bright_high_resolution_empty_street_with_houses_eb3a9472-5d66-431b-bc8e-5c0a100d214a.png',
    'Kalila_An_anime_bright_high_resolution_empty_village_with_open__6463d195-1e67-493b-9881-067235b86186.png',
    'Kalila_An_anime_bright_house_interior_very_high_resolution_larg_20e16237-2e59-4850-8d37-2abcfecd2040.png',
    'Kalila_An_anime_bright_house_interior_very_high_resolution_larg_6ee2e84e-b4a9-4c82-a4ce-09383faa8bfa.png',
    'Kalila_An_anime_bright_house_interior_very_high_resolution_larg_d528fb1a-6a75-4fa0-8f74-b3b0060d715f.png',
    'Kalila_An_anime_bright_house_interior_very_high_resolution_larg_deac5386-ede0-4db6-bf48-f2ca0a1688b9.png',
    'Kalila_An_anime_bright_house_interior_very_high_resolution_larg_e62e6d92-2e29-40e3-8943-616a75508d40.png',
    'Kalila_An_anime_bright_house_interior_very_high_resolution_larg_f4adfcbb-86ab-459b-ac50-f9dce80aa624.png',
    'Kalila_An_anime_bright_house_interior_with_a_small_baby_sleepin_fbb6aeb0-db68-4e54-9fa9-c11417e73979.png',
    'Kalila_An_anime_bright_large_room_with_a_small_baby_sleeping_dr_810af26f-3bac-4a1d-af03-f9bfa8b336af.png',
    'Kalila_An_anime_bright_large_room_with_a_small_baby_sleeping_dr_a0556ed2-4c72-47a2-a6ee-65a9693991a2.png',
    'Kalila_An_anime_bright_large_room_with_a_small_baby_sleeping_dr_a6d58ded-4513-42dd-bf6b-32f25584243d.png',
    'Kalila_An_anime_bright_large_room_with_a_small_baby_sleeping_dr_b5ff49bd-fd7e-4786-9617-20cd15e1e152.png',
    'Kalila_An_anime_bright_paved_stone_path_going_up_a_hill_very_hi_8f0380fc-5916-4678-b30d-bc948ccd6d8e.png',
    'Kalila_An_anime_bright_paved_stone_path_going_up_a_hill_very_hi_961dbc86-017f-4806-9e2d-343da6e2e77e.png',
    'Kalila_An_anime_bright_paved_stone_path_going_up_a_hill_very_hi_b1c37430-9e08-4904-b987-36bc9774db3a.png',
    'Kalila_An_anime_bright_sci-fi_city_alley_very_high_resolution_l_0f531299-7ca9-459d-bc33-d86002b5c1b2.png',
    'Kalila_An_anime_bright_sci-fi_city_alley_very_high_resolution_l_434cf94a-5352-4c13-b0be-7e4f36bea0dc.png',
    'Kalila_An_anime_bright_sci-fi_city_alley_very_high_resolution_l_4f881cd5-b769-4601-b143-9740f59a6312.png',
    'Kalila_An_anime_bright_sci-fi_city_alley_very_high_resolution_l_a7a9cb2c-ef6c-4e67-8f66-992ae47fe066.png',
    'Kalila_An_anime_bright_sci-fi_city_alley_very_high_resolution_l_ec602828-1db7-49fe-acf3-ab0812b5d8b9.png',
    'Kalila_An_anime_bright_sci-fi_city_street_very_high_resolution__3a1f4389-1eef-4f67-8187-5354397b99d6.png',
    'Kalila_An_anime_bright_sci-fi_city_street_very_high_resolution__659e99dd-37f9-4aab-8e17-44f0fa4be8cf.png',
    'Kalila_An_anime_bright_sci-fi_elevator_very_high_resolution_lar_7c8c6a4c-8f5a-42d3-a77b-e57e7cac2d4f.png',
    'Kalila_An_anime_bright_sci-fi_elevator_very_high_resolution_lar_df581320-fd02-43cf-b369-50cfeb4e5335.png',
    'Kalila_An_anime_bright_sci-fi_hallway_very_high_resolution_larg_1fbd56cb-7e14-4be9-811e-37afd9ea5bf7.png',
    'Kalila_An_anime_bright_sci-fi_hallway_very_high_resolution_larg_337932b0-b347-4540-aa54-3f5bf5a04905.png',
    'Kalila_An_anime_bright_sci-fi_hallway_very_high_resolution_larg_46e82508-1339-412c-92ff-b1936b3b7b21.png',
    'Kalila_An_anime_bright_sci-fi_hallway_very_high_resolution_larg_fcd11b47-a967-4a4d-b2e1-c2341555cd54.png',
    'Kalila_An_anime_bright_very_high_resolution_cyberpunk_apartment_a0f67295-301b-40c0-8e11-21430924ced1.png',
    'Kalila_An_anime_bright_very_high_resolution_fantasy_city_courty_3711bf6d-a194-4f51-afcd-87eddbecb80e.png',
    'Kalila_An_anime_bright_very_high_resolution_fantasy_city_courty_3c8ec085-04ca-4eb6-b590-5ad5892d55de.png',
    'Kalila_An_anime_bright_very_high_resolution_fantasy_city_courty_5db35168-e9b6-40b5-887e-3a5a4485645e.png',
    'Kalila_An_anime_bright_very_high_resolution_fantasy_city_courty_6c1b994c-24fe-45e2-81ea-b8bc5bf3d471.png',
    'Kalila_An_anime_bright_very_high_resolution_spaceship_bedroom_l_0fad8103-509d-4962-8006-e496384dc1e8.png',
    'Kalila_An_anime_bright_very_high_resolution_spaceship_bedroom_l_1612ece0-d1cf-4be9-a7f7-12213f0a2194.png',
    'Kalila_An_anime_bright_very_high_resolution_spaceship_bedroom_l_2469ea17-2b36-42d9-bebb-c3502b79c183.png',
    'Kalila_An_anime_bright_very_high_resolution_spaceship_bedroom_l_5cbc6449-8b86-45a7-9424-5d8d37813e54.png',
    'Kalila_An_anime_bright_very_high_resolution_spaceship_bedroom_l_5e5d568b-e751-429d-9162-2d8674cb5dda.png',
    'Kalila_An_anime_bright_very_high_resolution_spaceship_command_b_21dec901-8a43-40b9-96b3-1aa3a43626ba.png',
    'Kalila_An_anime_bright_very_high_resolution_spaceship_command_b_7c4e9030-185e-420d-aff8-9f0251ee2b56.png',
    'Kalila_An_anime_bright_very_high_resolution_spaceship_command_b_cbd0b347-de7c-4195-9e63-e90e793937de.png',
    'Kalila_An_anime_bright_very_high_resolution_spaceship_corridor__2efb51b0-48f7-4ab6-b192-fa2041ed23ed.png',
    'Kalila_An_anime_bright_very_high_resolution_spaceship_corridor__47492ca1-2cac-482a-9427-192a6aeffde6.png',
    'Kalila_An_anime_bright_very_high_resolution_spaceship_corridor__5f972200-7e7c-463a-8196-7f94e016f834.png',
    'Kalila_An_anime_bright_very_high_resolution_spaceship_corridor__697b2595-dc2c-4f29-ba88-1f865c2b9211.png',
    'Kalila_An_anime_bright_very_high_resolution_spaceship_corridor__788c4d4f-5cf5-4efd-a049-5961be91bdca.png',
    'Kalila_An_anime_bright_very_high_resolution_spaceship_corridor__94e424a5-424d-4b5c-b416-c198056ee1b1.png',
    'Kalila_An_anime_bright_very_high_resolution_spaceship_corridor__9cfef455-1589-4d6f-ab89-3984679df34b.png',
    'Kalila_An_anime_bright_very_high_resolution_spaceship_corridor__a6f6144e-28ad-4899-a0aa-60615f8e76fe.png',
    'Kalila_An_anime_bright_village_in_the_forest_very_high_resoluti_37c46d5a-9aa4-4436-98ae-c9ef8eda74b4.png',
    'Kalila_An_anime_bright_village_in_the_forest_very_high_resoluti_50ae2208-ec94-430e-80ac-8e1fb2bb91fd.png',
    'Kalila_An_anime_bright_village_in_the_forest_very_high_resoluti_92dadf26-308e-49e4-9cc7-d0d2f545b40a.png',
    'Kalila_An_anime_bright_village_in_the_forest_very_high_resoluti_a3730923-7729-40ae-b7e7-94b20688efa7.png',
    'Kalila_An_anime_bright_village_in_the_forest_very_high_resoluti_d22483e7-9637-4cfc-ac37-a43ccb9dcb90.png',
    'Kalila_An_anime_large_clean_penthouse_with_skyscraper_windows_a_5b769f8b-4ec7-46c5-a6e5-b313c967d3f0.png',
    'Kalila_An_anime_large_clean_penthouse_with_skyscraper_windows_a_af1c87d9-15a6-475d-a061-3aaf11e38fc2.png',
    'Kalila_An_anime_large_clean_penthouse_with_skyscraper_windows_a_b5048c63-bebd-48e8-985c-0d87946b91c9.png',
    'Kalila_An_anime_large_open_room_with_mechs_very_high_resolution_12433f0c-ec09-4210-b4ea-5bfbed8f956c.png',
    'Kalila_An_anime_large_open_room_with_mechs_very_high_resolution_625e1236-d131-4230-aec2-61d2d2b92a80.png',
    'Kalila_An_anime_large_open_room_with_mechs_very_high_resolution_b33fc487-96a1-4ab6-88cb-ff927f02327a.png',
    'Kalila_An_anime_large_open_room_with_mechs_very_high_resolution_f50f7f6a-8a62-4851-ac35-0f3b9ecbac60.png',
    'Kalila_An_empty_bright_detailed_anime_city_street_with_houses._1059add9-846f-441c-80e3-e78be12e5f3b.png',
    'Kalila_An_empty_bright_detailed_anime_city_street_with_houses._62f633d5-c769-4db6-a06d-c198c64be8fb.png',
    'Kalila_An_empty_bright_detailed_anime_city_street_with_houses._a463835c-2648-4926-9aee-e4ff99248467.png',
    'Kalila_An_empty_bright_high_resolution_anime_city_street_with_h_12a9c6a9-836b-4544-bb84-297f00dbdf30.png',
    'Kalila_An_empty_bright_high_resolution_anime_city_street_with_h_478f2773-31dc-4937-abf1-5e402876bea7.png',
    'Kalila_An_empty_bright_high_resolution_anime_city_street_with_h_63f498b4-a6b2-427c-abe9-94af09022952.png',
    'Kalila_An_empty_bright_high_resolution_anime_city_street_with_h_7869f253-9bdd-431c-a2c8-a7a5dc35833a.png',
    'Kalila_anime_cyberpunk_bright_empty_city_alley_high_resolution__163ba5f1-caca-4404-98da-5a3551b62e24.png',
    'Kalila_anime_cyberpunk_bright_empty_city_alley_high_resolution__6ad09cb9-e920-44fe-b13b-ff5765e8d3d5.png',
    'Kalila_anime_cyberpunk_bright_empty_city_alley_upper_view_high__00d68f09-be85-4acc-8154-7a755dc21825.png',
    'Kalila_anime_cyberpunk_bright_empty_city_alley_upper_view_high__0d3d772f-bd97-408d-b854-f6274e2488e2.png',
    'Kalila_anime_cyberpunk_bright_empty_city_alley_upper_view_high__1a57f073-3cb5-4b0c-a339-c844c313dc94.png',
    'Kalila_anime_cyberpunk_bright_empty_city_alley_upper_view_high__219eac06-a586-4f87-93cd-eb7cc23bd794.png',
    'Kalila_anime_cyberpunk_bright_empty_city_alley_upper_view_high__561c5e74-62ef-4635-baff-c72a15f0fefb.png',
    'Kalila_anime_cyberpunk_bright_empty_city_alley_upper_view_high__67930432-4de8-4b77-b7c4-7a5bb5a84c1c.png',
    'Kalila_anime_cyberpunk_bright_empty_city_alley_upper_view_high__6b147d1b-48cf-4b0e-bf91-c272264c9cdb.png',
    'Kalila_anime_cyberpunk_bright_empty_city_alley_upper_view_high__8b54c3a2-cc72-4bfa-acda-8bc900c738ba.png',
    'Kalila_anime_cyberpunk_bright_empty_city_alley_upper_view_high__8d920c70-f3af-429b-8703-48e0d7bb102e.png',
    'Kalila_anime_cyberpunk_bright_empty_city_alley_upper_view_high__92d6bc17-4039-4461-87c4-31075dbe7305.png',
    'Kalila_anime_cyberpunk_bright_empty_city_alley_upper_view_high__b3fa9af4-5e6b-47d9-8db5-bf80afa0980b.png',
    'Kalila_anime_cyberpunk_bright_empty_city_alley_upper_view_high__e0951408-b69b-40b1-9acc-1542cc7c2bd7.png',
    'Kalila_anime_cyberpunk_bright_empty_city_alley_upper_view_high__f44bfcd4-1769-4717-953a-0208792554b4.png',
    'Kalila_anime_cyberpunk_bright_empty_underground_complex_high_re_1d887ce8-073f-48e5-9e6e-5871a9ed85cc.png',
    'Kalila_anime_cyberpunk_bright_empty_underground_complex_high_re_4db48d44-99cd-440f-85c9-a61733a3135e.png',
    'Kalila_anime_cyberpunk_bright_empty_underground_complex_high_re_626caa64-892b-49ed-a973-794f9aad1542.png',
    'Kalila_anime_cyberpunk_bright_empty_underground_complex_high_re_ad881772-a81f-4260-bbc5-0705c06f9b67.png',
    'Kalila_anime_cyberpunk_bright_empty_underground_complex_high_re_bf63bd04-52c1-40a4-bdb4-84edbfb30d1c.png',
    'Kalila_anime_cyberpunk_bright_empty_underground_complex_upper_v_2d0d049f-7cbf-4a57-9b67-3c83c7c86e30.png',
    'Kalila_anime_cyberpunk_bright_empty_underground_complex_upper_v_2f320bf9-5922-40cd-9706-653db31a087c.png',
    'Kalila_anime_cyberpunk_bright_empty_underground_complex_upper_v_3f7d446c-d359-42aa-bd56-8df7cb6b0da6.png',
    'Kalila_anime_cyberpunk_bright_empty_underground_complex_upper_v_459303d2-822e-4112-a717-42fa9703de51.png',
    'Kalila_anime_cyberpunk_bright_empty_underground_complex_upper_v_95930e20-8239-4849-b376-490d8b9fcc13.png',
    'Kalila_anime_cyberpunk_bright_empty_underground_complex_upper_v_a1a80cbe-0a50-42a5-93ce-c0725fea1548.png',
    'Kalila_anime_cyberpunk_bright_empty_underground_complex_upper_v_cc02102b-1917-490a-a093-8aa5741b528b.png',
    'Kalila_anime_cyberpunk_bright_empty_underground_complex_upper_v_ed957b05-3f22-4884-b2f0-a29a93b06fb8.png',
    'Kalila_anime_cyberpunk_bright_empty_underground_corridor_door_h_66e9b69b-db03-42f3-b63e-77f5aff2d148.png',
    'Kalila_anime_cyberpunk_bright_empty_underground_corridor_door_h_dcca598e-ee2a-4bdd-923b-0074c64718c1.png',
    'Kalila_anime_cyberpunk_bright_empty_underground_corridor_door_h_fde6daea-4fe1-4c25-b570-85498bfba719.png',
    'Kalila_anime_cyberpunk_bright_empty_underground_ledge_high_reso_f47d48a5-f79d-4585-a6c2-96c9d88de8b0.png',
    'Kalila_anime_cyberpunk_bright_empty_underground_power_reactor_h_1b6b18a2-b8a4-43a4-99d2-90c15b9fa2ec.png',
    'Kalila_anime_cyberpunk_bright_empty_underground_power_reactor_h_dbf02c9a-f699-4860-a524-549411af5d88.png',
    'Kalila_anime_cyberpunk_bright_empty_underground_water_works_hig_282e3d2f-6d9f-4fb0-93ac-03dc9e8a3483.png',
    'Kalila_anime_cyberpunk_bright_empty_underground_water_works_hig_2e3acd7b-2f40-4d59-b5a9-016dde06c30a.png',
    'Kalila_anime_cyberpunk_bright_empty_underground_water_works_hig_3f46522c-8e25-4723-9063-a7f1ab991509.png',
    'Kalila_anime_cyberpunk_bright_empty_underground_water_works_hig_80a2f061-ffe6-4a7e-bd88-67f4a9761afc.png',
    'Kalila_anime_cyberpunk_bright_empty_underground_water_works_hig_a7e6e781-c45d-4f9e-95fc-5360311bc6aa.png',
    'Kalila_anime_cyberpunk_bright_empty_underground_water_works_ora_dac376d8-9c46-498c-86df-09dac78306f5.png',
    'Kalila_anime_cyberpunk_city_alley_high_resolution_highly_detail_26c770e4-3fef-485a-bc19-cd4700804bc3.png',
    'Kalila_anime_cyberpunk_city_alley_high_resolution_highly_detail_aade886f-f409-4b2a-98f0-3baa84625360.png',
    'Kalila_anime_cyberpunk_city_alley_high_resolution_highly_detail_c5a4aaac-cbbd-4532-95b1-2712bf080de2.png',
    'Kalila_anime_cyberpunk_city_alley_high_resolution_highly_detail_f2177a7c-e20e-412d-8781-158b92bf6eda.png',
    'Kalila_anime_cyberpunk_city_alley_high_resolution_highly_detail_fe22c89f-1a6c-4e1d-ba26-ca7b37ec1e9b.png',
];
const imgUrls = imgNames.map(n => `${assetsBaseUrl}/images/${n}`);

//

const _loadImageArrayBuffer = async u => {
    const res = await fetch(u);
    const arrayBuffer = await res.arrayBuffer();
    return arrayBuffer;
};
const _loadVideo = async u => {
    const v = document.createElement('video');
    v.crossOrigin = 'Anonymous';
    v.src = u;
    await new Promise((accept, reject) => {
        v.oncanplaythrough = accept;
        v.onerror = reject;
    });
    return v;
};

//

const _startApp = (canvas, u) => {
    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
    });

    const camera = new THREE.PerspectiveCamera();

    const scene = new THREE.Scene();
    scene.autoUpdate = false;

    // camera manager
    const zineCameraManager = new ZineCameraManager(camera, {
        normalizeView: false,
        followView: false,
    });

    (async () => {
        const imageArrayBuffer = await _loadImageArrayBuffer(u);

        const uint8Array = await compileScene(imageArrayBuffer);

        const zineStoryboard = new ZineStoryboard();
        zineStoryboard.load(uint8Array);

        const panel0 = zineStoryboard.getPanel(0);
        const zineRenderer = new ZineRenderer({
            panel: panel0,
            alignFloor: true,
        });

        // scene mesh
        scene.add(zineRenderer.scene);
        zineRenderer.scene.updateMatrixWorld();

        // path mesh
        const splinePoints = zineRenderer.metadata.paths.map(p => new THREE.Vector3().fromArray(p.position));
        const pathMesh = new PathMesh(splinePoints, {
            animate: true,
        });
        scene.add(pathMesh);
        pathMesh.updateMatrixWorld();

        // apply camera
        // camera.copy(zineRenderer.camera);
        zineCameraManager.setLockCamera(zineRenderer.camera);
        zineCameraManager.toggleCameraLock();
    })();

    // video mesh
    let video = null;
    let videoTexture = null;
    let videoMesh = null;
    (async () => {
        video = await _loadVideo(`${assetsBaseUrl}/videos/upstreet2.mp4`);;
        video.muted = true;
        video.play();
        video.loop = true;
        // video.playbackRate = 2;
        video.style.cssText = `\
            position: absolute;
            top: 0;
            left: 0;
        `;
        // document.body.appendChild(video);

        // full screen video mesh
        const geometry = new THREE.PlaneGeometry(2, 2, 1, 1);

        videoTexture = new THREE.VideoTexture(video);
        const videoMaterial = new THREE.ShaderMaterial({
            uniforms: {
                map: {
                    value: videoTexture,
                    needsUpdate: true,
                },
                screenResolution: {
                    value: new THREE.Vector2(canvas.width, canvas.height),
                    needsUpdate: true,
                },
                videoResolution: {
                    value: new THREE.Vector2(1980, 1080),
                    needsUpdate: true,
                },
                offset: {
                    value: new THREE.Vector2(0, -0.3),
                    needsUpdate: true,
                },
            },
            vertexShader: `\
                varying vec2 vUv;

                void main() {
                    vUv = uv;
                    gl_Position = vec4(position, 1.0);
                }
            `,
            fragmentShader: `\
                uniform sampler2D map;
                uniform vec2 screenResolution;
                uniform vec2 videoResolution;
                uniform vec2 offset;
                varying vec2 vUv;

                const vec3 baseColor = vec3(${
                    new THREE.Color(0xd3d3d3).toArray().map(n => n.toFixed(8)).join(', ')
                });
                // const vec3 baseColor = vec3(0., 1., 0.);
                /* const vec3 baseColor = vec3(${
                    new THREE.Color(0x01b140).toArray().map(n => n.toFixed(8)).join(', ')
                }); */

                void main() {
                    // adjust uv for the video aspect ratios of the screen and the video
                    // to keep the video centered and unstretched regardless of the screen aspect ratio
                    float screenAspectRatio = screenResolution.x / screenResolution.y;
                    float videoAspectRatio = videoResolution.x / videoResolution.y;

                    vec2 uv = vUv;
                    uv = (uv - 0.5) * 2.0; // [-1, 1]
                    uv.y /= screenAspectRatio;
                    uv.y *= videoAspectRatio;
                    uv += offset;
                    uv = (uv + 1.0) / 2.0; // [0, 1]
                    
                    gl_FragColor = texture2D(map, uv);

                    // float colorDistance = abs(gl_FragColor.r - baseColor.r) +
                    //     abs(gl_FragColor.g - baseColor.g) +
                    //     abs(gl_FragColor.b - baseColor.b);
                    float colorDistance = distance(gl_FragColor.rgb, baseColor);
                    if (colorDistance < 0.01) {
                        discard;
                    } else {
                        gl_FragColor.a = min(max(colorDistance * 4., 0.0), 1.0);
                    }
                }
            `,
            side: THREE.DoubleSide,
            transparent: true,
            alphaToCoverage: true,
            // alphaTest: 0.1,
        });

        videoMesh = new THREE.Mesh(geometry, videoMaterial);
        videoMesh.frustumCulled = false;
        scene.add(videoMesh);
    })();

    // resize handler
    const _setSize = () => {
        renderer.setSize(globalThis.innerWidth, globalThis.innerHeight);

        if (videoMesh) {
            videoMesh.material.uniforms.screenResolution.value.set(
                globalThis.innerWidth,
                globalThis.innerHeight
            );
            videoMesh.material.uniforms.screenResolution.needsUpdate = true;
        }
    };
    _setSize();
    renderer.setPixelRatio(window.devicePixelRatio);
    globalThis.addEventListener('resize', e => {
        _setSize();
    });

    // key handlers
    globalThis.addEventListener('keydown', e => {
        switch (e.key) {
            case 'g': {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('trigger animation');
                
                break;
            }
        }
    });

    // frame loop
    let lastTimestamp = performance.now();
    const _frame = () => {
      requestAnimationFrame(_frame);

      if (!document.hidden) {
        const timestamp = performance.now();
        const timeDiff = timestamp - lastTimestamp;
        zineCameraManager.updatePost(timestamp, timeDiff);

        renderer.render(scene, camera);
      }
    };
    _frame();
};

//

const Gallery = ({
    onLoadImage,
}) => {
    return (
        <div className={styles.gallery}>
            {imgUrls.map(u => {
               return (
                   <GalleryImage
                       src={u}
                       onClick={e => {
                            onLoadImage(u);
                       }}
                       key={u}
                   />
               );
            })}
        </div>
    );
};

//

const MainScreen = ({
    appStarted,
    canvasRef,
}) => {
    return (
        <div className={classnames(
            styles.mainScreen,
            appStarted ? styles.enabled : null,
        )}>
            <canvas className={classnames(
                styles.canvas,
            )} ref={canvasRef} />
            <footer className={styles.footer}>
                <span className={styles.bold}>SEVERE WARNING:</span> This product is not intended for children under age sixty. <span className={styles.bold}>This is an AI generated product.</span> The ideas expressed are not proven to be safe. This product contains course language and due to its nature it should be viewed twice.<span className={styles.right}>Made by the Lisk.</span>
            </footer>
        </div>
    );
};

//

const GalleryImage = ({
    src,
    onClick,
}) => {
    return (
        <div className={styles.imageWrap}>
            <img src={src} crossOrigin="Anonymous" className={styles.image} onClick={onClick} />
        </div>
    );
};

//

export const TitleScreen = () => {

    const [appStarted, setAppStarted] = useState(false);

    // forward the canvas ref to the main screen
    const canvasRef = useRef(null);

    //

    return (
        <div
            className={styles.titleScreen}
        >
            <MainScreen
                appStarted={appStarted}
                canvasRef={canvasRef}
            />
            {appStarted ? null : <Gallery
                onLoadImage={u => {
                    if (canvasRef.current && !appStarted) {
                        setAppStarted(true);
                        _startApp(canvasRef.current, u);
                    }
                }}
            />}
        </div>
    );

};