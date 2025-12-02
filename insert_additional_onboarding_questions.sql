INSERT INTO onboarding_questions (
  question_text,
  option_a, option_b, option_c, option_d,
  correct_answer,
  difficulty_level,
  subject,
  explanation
) VALUES
-- Question 1
('The new library has a large reading room where students can sit in _________ and focus on their studies.',
 'silence','tension','sorrow','glamour','A',1,'english',''),
-- Question 2
('The flight was cancelled due to the heavy snow, so we had to make _________ arrangements to travel by train instead.',
 'tiny','dense','ultimate','alternative','D',1,'english',''),
-- Question 3
('Despite the initial difficulty, the construction workers finally managed to _________ the main bridge connecting the two cities.',
 'invade','complete','vanish','scatter','B',1,'english',''),
-- Question 4
('Before giving a speech, the nervous politician often takes a deep _________ to calm himself down.',
 'doubt','gesture','breath','habit','C',1,'english',''),
-- Question 5
('The charity organization relies entirely on public _________ to support its projects and operations.',
 'tuition','curiosity','donations','landscape','C',1,'english',''),
-- Question 6
('The museum displays a beautiful collection of traditional clothes that date back to the 18th _________.',
 'territory','century','monument','ingredient','B',2,'english',''),
-- Question 7
('The mountain biking trail is designed to be challenging, with steep slopes and rough _________.',
 'fiction','surface','pattern','emotion','B',2,'english',''),
-- Question 8
('After failing to save the drowning man, the lifeguard was filled with a deep sense of _________ and regret.',
 'misery','glory','triumph','tension','A',2,'english',''),
-- Question 9
('The small, remote village suffered from a serious lack of modern communication _________ like reliable internet access.',
 'devices','fabrics','revenues','fortunes','A',2,'english',''),
-- Question 10
('If you want to achieve a healthy weight, you must learn to _________ a balance between diet and exercise.',
 'strike','dismiss','withdraw','offend','A',2,'english',''),
-- Question 11
('The professor’s lecture was so complex and full of jargon that it was nearly _________ to the undergraduate students.',
 'accessible','identical','comprehensible','subjective','C',3,'english',''),
-- Question 12
('His calm _________ under pressure allowed him to make rational decisions during the crisis.',
 'gratitude','temper','demeanor','destiny','C',3,'english',''),
-- Question 13
('The author’s detailed description of the landscape seemed so _________ that readers could almost feel the cold wind blowing.',
 'vivid','humble','massive','delicate','A',3,'english',''),
-- Question 14
('The scientist managed to _________ a new hypothesis based on years of observational data.',
 'confine','formulate','interfere','surpass','B',3,'english',''),
-- Question 15
('The committee needs to reach a _________ before proceeding with the next stage of the project.',
 'consensus','segment','dimension','capacity','A',3,'english',''),
-- Question 16
('The company''s unethical business practices finally led to a public _________ that severely damaged its reputation.',
 'analogy','setback','analogy','scrutiny','D',4,'english',''),
-- Question 17
('Despite repeated warnings, the city government failed to _________ the potential dangers of the faulty dam.',
 'confine','rectify','anticipate','retrieve','C',4,'english',''),
-- Question 18
('The newly discovered ancient manuscript provides invaluable _________ into the daily lives of the civilization’s inhabitants.',
 'insights','attributes','remnants','constraints','A',4,'english',''),
-- Question 19
('The board meeting was held in a strictly _________ manner, with no spontaneous discussion allowed outside the agenda.',
 'preliminary','plausible','procedural','perpetual','C',4,'english',''),
-- Question 20
('The scientist’s argument was widely criticized for being highly _________, relying too much on personal belief rather than experimental data.',
 'empirical','tentative','theoretical','dogmatic','D',4,'english','')
ON CONFLICT DO NOTHING;
