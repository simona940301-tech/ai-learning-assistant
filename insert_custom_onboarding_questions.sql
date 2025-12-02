-- Insert custom onboarding questions (difficulty 5, English vocabulary)
INSERT INTO onboarding_questions (
  question_text,
  option_a, option_b, option_c, option_d,
  correct_answer,
  difficulty_level,
  subject,
  explanation
) VALUES
-- Question 1
('Dispensing the exact amount of chemical needed for the reaction proved to be quite challenging.',
 'Dispensing', 'Dismantling', 'Detaching', 'Delegating',
 'A', 5, 'english', ''),
-- Question 2
('The newly implemented tax incentive is designed to encourage small businesses to invest more.',
 'incentive', 'obstacle', 'criterion', 'obligation',
 'A', 5, 'english', ''),
-- Question 3
('Winning the literary prize brought the previously obscure writer widespread fame and recognition.',
 'obscure', 'potent', 'arbitrary', 'terminal',
 'A', 5, 'english', ''),
-- Question 4
('Students are required to abide by the university’s honor code, even outside the classroom.',
 'violate', 'articulate', 'abide by', 'alleviate',
 'C', 5, 'english', ''),
-- Question 5
('What is the implication of the two companies merging—will it lead to job losses?',
 'integrity', 'implication', 'intuition', 'infrastructure',
 'B', 5, 'english', ''),
-- Question 6
('She became solemn after reading the depressing news report about global warming.',
 'eloquent', 'profound', 'vigorous', 'solemn',
 'D', 5, 'english', ''),
-- Question 7
('The new law aims to combat discrimination against minority groups in the workplace.',
 'compile', 'combat', 'contend', 'compel',
 'B', 5, 'english', ''),
-- Question 8
('The witness was unable to designate the identity of the person who had stolen her purse.',
 'designate', 'devise', 'denounce', 'deduce',
 'A', 5, 'english', ''),
-- Question 9
('The athlete’s inherent ability to ignore pain allowed him to finish the marathon despite an injury.',
 'inevitable', 'inherent', 'identical', 'implicit',
 'B', 5, 'english', ''),
-- Question 10
('After months of drought, the farmers felt great solace when the heavy rain finally arrived.',
 'solitude', 'serenity', 'solace', 'subtlety',
 'C', 5, 'english', '' )
ON CONFLICT DO NOTHING;
-- Verify insertion
SELECT difficulty_level, COUNT(*) AS count FROM onboarding_questions WHERE difficulty_level = 5 GROUP BY difficulty_level;
