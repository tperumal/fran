-- Pre-fill Fran's recipe collection
-- Run this in Supabase SQL Editor

DO $$
DECLARE
  fran_id uuid;
BEGIN
  SELECT id INTO fran_id FROM auth.users WHERE email = 'fmach002@gmail.com';
  IF fran_id IS NULL THEN
    RAISE EXCEPTION 'User fmach002@gmail.com not found';
  END IF;

  INSERT INTO recipes (profile_id, name, ingredients, instructions, tags) VALUES

  (fran_id, 'Chana Masala',
   '["2 tbsp oil","1 tbsp garlic","1 tbsp ginger","1/2 onion diced","2 serranos","1 tsp cumin seeds","1/4 tsp turmeric","1/2 tsp ground coriander","1 tsp Kashmiri chili powder","4 Roma tomatoes diced or can of diced tomatoes drained","1 tsp salt","2 cans chickpeas drained","1 1/2 cups chicken stock","1 tsp garam masala","2 tbsp cilantro","Kale"]'::jsonb,
   'Heat oil on low heat. Stir in garlic, ginger, onion, serranos. Cook 5 minutes. Stir in cumin, turmeric, coriander, chile powder, salt. Add tomatoes. Increase to medium heat and cook 5 minutes. Stir in chickpeas and stock. Bring to a boil, reduce heat, simmer until thickened about 5 minutes. Sprinkle with garam masala and top with cilantro.',
   '["curry","indian","vegetarian"]'::jsonb),

  (fran_id, 'Yellow Potato Curry',
   '["2 large or 4 small potatoes","Oil","1/2 or 1/4 onion finely chopped","Mustard seeds","Cumin seeds","Fennel seeds","Fenugreek seeds","Turmeric powder","2 green chilies or red dry chilies","Salt"]'::jsonb,
   'Peel and cube potatoes. Microwave in ziplock bag with water 4-5 minutes. Heat oil, add mustard, fennel, cumin, fenugreek seeds. Add onions and chilies. Once onions cooked, add 1 tsp turmeric. Add steamed potatoes and salt. Add a little water, stir, simmer on medium heat until water evaporates.',
   '["curry","indian","vegetarian","potato"]'::jsonb),

  (fran_id, 'Green Bean Curry',
   '["1 packet frozen French-cut green beans","1/2 small yellow onion finely chopped","2-3 tbsp oil","1/4 tsp cumin seeds","1/4 tsp mustard seeds","1/4 tsp fennel seeds","1/4 tsp fenugreek seeds","1 tbsp masala including Kashmiri masala","1 tsp turmeric powder","1 green chili halved","1 tomato finely chopped","Salt to taste","Cilantro"]'::jsonb,
   'Heat oil. Add cumin, mustard, fennel, fenugreek seeds. Add onions and chili, cook until soft. Add turmeric and masala. Add green beans and salt, mix. Add a little water, simmer on medium heat. Once beans cooked, create a well, add chopped tomato and cilantro. Simmer until tomatoes soften, then mix in.',
   '["curry","indian","vegetarian","green bean"]'::jsonb),

  (fran_id, 'Lamb Curry',
   '["2 lbs lamb cubed","1 onion sliced","2 bay leaves","1 tsp whole fennel seeds","2 serranos sliced in half","Cinnamon stick","2 tsp crushed ginger and garlic","1 tsp turmeric","3 tbsp masala","1 can diced tomatoes","3 potatoes peeled and quartered","2 cups water","2 tbsp salt","1 cup peas","Cilantro"]'::jsonb,
   'Heat oil, add onions, bay leaves, fennel seeds, serranos, cinnamon stick. Cook 5 mins. Add ginger/garlic, turmeric, masala. Cook 5 mins. Brown meat 5-10 mins. Add tomatoes, potatoes, 1 1/2 cups water, salt. Cover and cook on medium 20 minutes. Add peas, heat 10 mins. Sprinkle with cilantro.',
   '["curry","indian","lamb","meat"]'::jsonb),

  (fran_id, 'Steak Curry',
   '["2 lbs sirloin steak cubed","1 onion diced","2 bay leaves","1 tsp whole fennel seeds","2 serranos sliced in half","Cinnamon stick","2 tsp crushed ginger and garlic","1 tsp turmeric","2 tbsp masala","1 cup water","2 tbsp salt","1 can diced tomatoes","1 can large butter beans","Cilantro"]'::jsonb,
   'Heat oil, add onions, bay leaves, fennel seeds, serranos, cinnamon stick. Cook 5 mins. Add ginger/garlic, turmeric, masala. Cook 5 mins. Brown meat 5-10 mins. Add tomatoes, 1 cup water, salt. Cover and cook on medium 20 mins. Add beans, heat 10 mins. Sprinkle with cilantro. Serve with carrot salad.',
   '["curry","indian","steak","meat"]'::jsonb),

  (fran_id, 'Chicken Curry',
   '["1 whole chicken cut into portions or 1 breast with bones and boneless thighs","3 tbsp olive oil","3 cardamom pods","1 stick cinnamon","4 whole cloves","1 serrano split","1/2 onion diced","4 cloves garlic crushed","1 tsp ginger grated","1 tsp ground coriander","1 tsp ground cumin","1 tsp chili powder","1 tsp turmeric","2 tsp salt","2 small fresh tomatoes","1 1/2 cups water","2 russet potatoes peeled and chunked","1 tbsp cilantro"]'::jsonb,
   'Season chicken with 1 tsp salt, garlic, ginger. Brown chicken in olive oil, set aside. Heat oil in large saucepan. Fry cardamom, cinnamon, cloves, onions, garlic, ginger, coriander, cumin, chili powder, turmeric, salt for 10 mins. Stir in tomatoes, 1 1/2 cups water, potatoes. Cook 10 mins. Add chicken and cilantro, cook 10 mins then turn off.',
   '["curry","indian","chicken","meat"]'::jsonb),

  (fran_id, 'Mince Curry',
   '["2 tbsp olive oil","1/2 onion diced","1/2 tsp masala","1/2 tsp turmeric","2 pinches star anise/fennel seed","Bay leaf","2 tomatoes diced","2 large potatoes diced","1 1/2 cups water","1 cup peas","Garlic","Salt and pepper","Cilantro"]'::jsonb,
   'Heat oil, add onions, masala, turmeric, star anise, bay leaf. Cook until onions soft. Add tomatoes and potatoes. Add water. Marinate protein with garlic, salt and pepper, then add to pot. Cover for 30 mins. Sprinkle cilantro.',
   '["curry","indian","quick","meat"]'::jsonb),

  (fran_id, 'Aloo Gobi',
   '["2 tbsp evoo","3 Yukon potatoes quartered","1 head cauliflower in 1-inch chunks","1 tbsp garlic","2 tomatoes diced","1/2 onion chopped","2 tbsp cilantro chopped","1 tsp masala","1/2 tsp turmeric","2 tsp salt","1 tsp pepper","1 1/2 cups water","1/2 cup peas"]'::jsonb,
   'Boil water with salt, add potatoes for 10 mins, drain and set aside. Roast cauliflower at 400F for 20 mins, set aside. Heat pot to medium, add evoo, onion and garlic 5 mins. Add tomatoes and spices 5 mins. Add 1 1/2 cups water, cauliflower and potatoes, cover 10 mins. Add peas and cilantro, no lid, 10 mins.',
   '["curry","indian","vegetarian","cauliflower","potato"]'::jsonb),

  (fran_id, 'Fish Curry',
   '["1 tbsp ginger","2 tbsp olive oil","1 onion diced","4-6 garlic cloves","Serrano pepper optional","1 tsp masala","1/2 tsp turmeric","2 pinches mustard seed","Cumin seeds","Bay leaf","Curry leaves","2 cans diced or crushed tomatoes","1 tbsp tamarind paste","1/2 cup water","1 lb fish seasoned","Cilantro"]'::jsonb,
   'Heat oil, add onion, garlic, ginger, serrano. Add masala, turmeric, mustard seed, cumin seeds, bay leaf, curry leaves. Add tomatoes and tamarind paste with 1/2 cup water. Run immersion blender. Add seasoned fish. Cover for 20-30 mins. Sprinkle cilantro.',
   '["curry","indian","fish","seafood"]'::jsonb),

  (fran_id, 'Lamb Chop Chutney',
   '["1 pound lamb chops","2 tbsp olive oil","1 onion roughly chopped","2 cans diced tomatoes","1 tsp masala","1/2 tsp turmeric","Curry leaves","Ginger","Garlic","Salt and pepper"]'::jsonb,
   'Season chops with ginger, garlic, salt and pepper. Heat skillet, brown chops each side 5 mins, set aside. Heat olive oil in pot, add onion 5 mins. Add masala, turmeric, curry leaves, salt and pepper. Add tomatoes, cook 5 mins. Cover and simmer 10 mins. Blend with immersion blender. Add browned lamb chops to chutney and cook 10 mins.',
   '["curry","indian","lamb","meat","chutney"]'::jsonb),

  (fran_id, 'Carrot Salad',
   '["Cucumber thinly sliced","1 onion diced","3 chilies optional","4 radishes thinly sliced","Romaine lettuce","4 carrots","Lemon juice"]'::jsonb,
   'Grate carrots. Slice cucumber in small cubes or quartered. Thin slice half an onion and chop slices in half. Slice radishes and set aside. Slice romaine lettuce fine and set aside. Combine carrots, cucumbers and onions. Add lemon juice. Add radish when serving. Add lettuce as needed when serving.',
   '["salad","side","indian"]'::jsonb),

  (fran_id, 'Sambals',
   '["Diced tomatoes","Diced onions","Diced cucumbers","Lime juice","Salt and pepper"]'::jsonb,
   'Dice tomatoes, onions, and cucumbers. Combine and add lime juice, salt and pepper to taste.',
   '["condiment","side","indian","quick"]'::jsonb),

  (fran_id, 'Baked Beans',
   '["Serrano pepper","1/2 onion diced","1 tsp masala","1 tsp turmeric","1 can baked beans","1 can tomatoes","Oil","Salt and pepper"]'::jsonb,
   'Heat oil, add onions, serrano, masala, turmeric. Cook 5-10 mins on medium heat. Add tomatoes and beans, simmer 20 mins. Add salt and pepper to taste.',
   '["side","indian","quick","vegetarian"]'::jsonb),

  (fran_id, 'Egg Chutney',
   '["4 eggs","1-2 tbsp olive oil","1/2 onion diced","1 serrano pepper halved lengthwise","1 28oz can crushed tomatoes","1/2 tsp masala","1/2 tsp turmeric","Salt and pepper"]'::jsonb,
   'Heat oil, add onions, masala, turmeric. Cook 5-10 mins on medium heat. Add tomatoes until warm. Add eggs one by one to the top. Add salt and pepper to taste. Cover 5-7 mins until eggs are mostly cooked.',
   '["indian","eggs","quick"]'::jsonb),

  (fran_id, 'Tandoori',
   '["Meat of choice","Garlic","Ginger","Lemon juice","Salt","1/2 cup yogurt","1 tbsp paprika","1 tsp Kashmiri chile","1 tsp garam masala","1 tsp ground cumin","1/2 tsp ground cardamom"]'::jsonb,
   'Season meat with garlic, ginger, lemon juice, salt. Mix yogurt, paprika, Kashmiri chile, garam masala, cumin, cardamom into a paste. Coat meat with paste for a couple hours. Heat oven to 400F. Roast 20-30 mins.',
   '["indian","tandoori","meat"]'::jsonb),

  (fran_id, 'Masala Fish',
   '["Fish","Cumin/coriander mix","Minced garlic","Mint/pani puri mix","Turmeric","Lemon juice","Salt to taste"]'::jsonb,
   'Mix cumin/coriander, minced garlic, mint/pani puri mix, turmeric, lemon juice into a paste. Salt to taste. Coat fish. Fry 4-5 mins then flip. Fry 4-5 mins.',
   '["indian","fish","seafood","quick"]'::jsonb);

END $$;
