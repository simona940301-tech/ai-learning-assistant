#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Band {
    Low,
    Target,
    High,
}

#[derive(Clone, Debug)]
pub struct DdaSmoother {
    pub ewma: f64,
    pub alpha: f64,
    pub state: Band,
    pub switches: u8,
}

impl Default for DdaSmoother {
    fn default() -> Self {
        Self {
            ewma: 0.6,
            alpha: 0.6,
            state: Band::Target,
            switches: 0,
        }
    }
}

impl DdaSmoother {
    pub fn update(&mut self, last_correct: Option<bool>) -> (Band, f64) {
        if let Some(correct) = last_correct {
            let x = if correct { 1.0 } else { 0.0 };
            self.ewma = self.alpha * x + (1.0 - self.alpha) * self.ewma;

            let inferred = if self.ewma > 0.65 {
                Band::High
            } else if self.ewma < 0.55 {
                Band::Low
            } else {
                self.state
            };

            if inferred != self.state && self.switches < 2 {
                self.state = inferred;
                self.switches += 1;
            }
        }

        (self.state, self.factor())
    }

    pub fn factor(&self) -> f64 {
        match self.state {
            Band::Low => 0.9,
            Band::Target => 1.0,
            Band::High => 1.1,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn smoother_limits_switches() {
        let mut smoother = DdaSmoother::default();
        smoother.alpha = 1.0; // React immediately for test

        // Force switches more than twice
        let sequence = [true, false, true, false, true];
        for result in sequence {
            smoother.update(Some(result));
        }

        assert!(
            smoother.switches <= 2,
            "Smoother should limit tier switches per match"
        );
    }

    #[test]
    fn smoother_changes_factor() {
        let mut smoother = DdaSmoother::default();
        smoother.alpha = 1.0;

        let (_, factor_low) = smoother.update(Some(false));
        let (_, factor_high) = smoother.update(Some(true));

        assert!(factor_low <= 1.0);
        assert!(factor_high >= 1.0);
    }
}
