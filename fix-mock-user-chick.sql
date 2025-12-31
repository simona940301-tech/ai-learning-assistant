-- Initialize chick fields for mock user
UPDATE profiles 
SET 
  chick_iq = 5,
  chick_fatigue = 0,
  chick_emotion_state = 'normal'
WHERE id = 'e770f9cd-52a7-43de-b983-70f6f78d2f53';
