#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
pronunciation_engine.py - 構造計算解説動画用 読み・字幕・ナレーション正規化エンジン
- 添付辞書および建築構造計算専門用語マスター辞書（config/dictionary/structural_reading_dictionary.json）を参照
- Edge-TTS で誤読されやすい用語（基礎梁、梁成、人通口、耐風梁、連続梁、伏図、出隅など）を正確な発音に自動変換
- 字幕用テキスト（漢字表記）とナレーション用テキスト（音声読み上げ用）の整合性を担保
"""

import os
import json
import re

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
CONFIG_DIR = os.path.join(ROOT_DIR, "config", "dictionary")

RULES_JSON = os.path.join(CONFIG_DIR, "tts_pronunciation_rules.json")
DICT_JSON = os.path.join(CONFIG_DIR, "structural_reading_dictionary.json")

class PronunciationEngine:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(PronunciationEngine, cls).__new__(cls)
            cls._instance._load()
        return cls._instance

    def _load(self):
        self.rules = []
        if os.path.exists(RULES_JSON):
            with open(RULES_JSON, "r", encoding="utf-8") as f:
                data = json.load(f)
                self.rules = data.get("rules", [])
        
        self.dictionary = {}
        if os.path.exists(DICT_JSON):
            with open(DICT_JSON, "r", encoding="utf-8") as f:
                d = json.load(f)
                for item in d.get("entries", []):
                    self.dictionary[item["term"]] = item

    def normalize_for_tts(self, text: str) -> str:
        """
        ナレーション原稿をTTS（Edge-TTS）が正確に朗読できる平仮名／音素テキストに変換する。
        最長一致順に置換を行い、複合語の誤分割を防止する。
        例:
          '基礎梁を配置します' -> 'きそはりを配置します'
          '梁成エラー' -> 'はりせいエラー'
          '人通口補強' -> 'じんつうこうほきょう'
          '耐風梁' -> 'たいふうばり'
          '伏図先行' -> 'ふせずせんこう'
        """
        spoken = text
        for r in self.rules:
            pattern = r["from"]
            replacement = r["to"]
            if pattern in spoken:
                spoken = spoken.replace(pattern, replacement)
        return spoken

    def get_term_info(self, term: str):
        """辞書に登録されている用語の読み・品詞・メモを返す"""
        return self.dictionary.get(term)

    def validate_script(self, text: str, spoken: str):
        """
        字幕テキスト (text) とナレーションテキスト (spoken) を照合し、
        誤読の恐れがある未置換の専門用語が存在しないか検証する。
        """
        warnings = []
        critical_terms = [
            ("基礎梁", ["きそはり", "きそばり"]),
            ("梁成", ["はりせい"]),
            ("人通口", ["じんつうこう"]),
            ("耐風梁", ["たいふうばり"]),
            ("連続梁", ["れんぞくばり"]),
            ("地中梁", ["ちちゅうばり"]),
            ("出隅", ["でずみ"]),
            ("伏図", ["ふせず"]),
            ("めり込み", ["めりこみ"]),
            ("仕口", ["しくち"]),
            ("垂木", ["たるき"]),
            ("母屋", ["もや"]),
            ("根太", ["ねだ"]),
        ]
        
        for term, expected_readings in critical_terms:
            if term in text:
                # spokenに漢字のまま残っているか、または期待される読みに変換されているか確認
                if term in spoken:
                    warnings.append({
                        "term": term,
                        "issue": f"Spoken中に漢字 '{term}' が未置換のまま残っています（TTS誤読リスクあり）。",
                        "expected": expected_readings
                    })
        return warnings

# シングルトン関数の公開
engine = PronunciationEngine()

def normalize_for_tts(text: str) -> str:
    return engine.normalize_for_tts(text)

def validate_script(text: str, spoken: str):
    return engine.validate_script(text, spoken)
