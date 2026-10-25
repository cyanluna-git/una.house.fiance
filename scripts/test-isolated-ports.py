#!/usr/bin/env python3
"""Regression guard: independently created contexts must inherit injected URLs."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]

class IsolatedPorts(unittest.TestCase):
    def test_custom_layout_context_inherits_base_url(self):
        text = (ROOT / 'tests/layout/mobile-layout.spec.ts').read_text()
        custom = text[text.index('for (const vp of VIEWPORTS.filter'):]
        self.assertNotRegex(custom, r'https?://(?:localhost|127\.0\.0\.1):\d+')
        self.assertIn('async ({ browser, baseURL })', custom)
        self.assertRegex(custom, r'baseURL\s*[,}]')

    def test_journey_uses_injected_origin_for_fetch_and_cookie(self):
        text = (ROOT / 'tests/e2e/journey.spec.ts').read_text()
        self.assertNotRegex(text, r'https?://(?:localhost|127\.0\.0\.1):\d+')
        self.assertIn('isolatedBaseURL()', text)
        self.assertIn('new URL(BASE).hostname', text)

if __name__ == '__main__':
    unittest.main()
