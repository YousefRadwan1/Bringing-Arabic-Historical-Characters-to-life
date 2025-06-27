// // modules/lipsync-ar.mjs

// /**
// * @class Arabic lip-sync processor
// * @description Implements Oculus-compatible viseme mapping for Modern Standard Arabic
// */
// class LipsyncAr {
//     constructor() {
//       // Arabic to Oculus viseme mapping (v0.9)
//       this.visemes = {
//         // Vowels and diphthongs
//         'ا': 'aa', 'و': 'UW', 'ي': 'I', 'ى': 'aa',
//         'َ': 'aa', 'ُ': 'UW', 'ِ': 'I', // Short vowels
        
//         // Consonants grouped by articulation
//         'ب': 'PP', 'م': 'PP',            // Bilabials
//         'ت': 'DD', 'ط': 'DD', 'د': 'DD', // Dentals
//         'ث': 'TH', 'ذ': 'TH', 'ظ': 'TH', // Interdentals
//         'ج': 'CH', 'ش': 'CH',            // Palatals
//         'س': 'SS', 'ص': 'SS', 'ز': 'SS', // Sibilants
//         'ف': 'FF',                       // Labiodental
//         'ك': 'kk', 'ق': 'kk', 'خ': 'kk', // Velars
//         'ر': 'RR',                       // Trill
//         'ل': 'nn', 'ن': 'nn',            // Laterals/Nasals
//         'ه': 'sil', 'ح': 'sil', 'ع': 'sil', 'ء': 'sil' // Glottals
//       };
  
//       // Duration coefficients (empirical values)
//       this.durations = {
//         'ا': 1.2, 'و': 1.1, 'ي': 0.9, 'ى': 1.0,
//         'َ': 0.8, 'ُ': 0.7, 'ِ': 0.7,
//         'ب': 1.1, 'م': 1.3,
//         'ت': 1.0, 'ط': 1.4, 'د': 1.0,
//         'ث': 1.2, 'ذ': 1.2, 'ظ': 1.5,
//         'ج': 1.3, 'ش': 1.4,
//         'س': 1.2, 'ص': 1.5, 'ز': 1.2,
//         'ف': 1.0, 'ك': 1.1, 'ق': 1.4, 
//         'ر': 0.8, 'ل': 1.0, 'ن': 1.0
//       };
  
//       // Pause durations
//       this.pauses = {
//         ' ': 1, '،': 2, '؛': 3,    // Comma, Arabic semicolon
//         '\n': 4, '\t': 4, 'ـ': 0.5 // Kashida justification
//       };
//     }
  
//     /**
//     * Preprocess Arabic text with linguistic normalization
//     * @param {string} s - Input text
//     * @returns {string} Preprocessed text
//     */
//     preProcessText(s) {
//       return s
//         .normalize('NFD')
//         .replace(/[\u064B-\u065F\u0670]/g, '') // Remove non-essential diacritics
//         .normalize('NFC')
//         .replace(/[٠-٩]/g, m => '۰'.charCodeAt(0) - m.charCodeAt(0) + '0'.charCodeAt(0))
//         .replace(/(\d+)/g, this._numberToArabicWords.bind(this))
//         .replace(/[#_*'"؛:]/g, '')
//         .replace(/%/g, ' بالمئة')
//         .replace(/\$/g, ' دولار')
//         .replace(/€/g, ' يورو')
//         .replace(/&/g, ' و ')
//         .replace(/\+/g, ' زائد ')
//         .replace(/(\d),(\d)/g, '$1 فاصلة $2')
//         .replace(/(\D)\1{2,}/g, '$1$1') // Limit repeated chars
//         .replace(/\s+/g, ' ')
//         .trim();
//     }
  
//     /**
//     * Convert text to viseme sequence
//     * @param {string} text - Processed text
//     * @returns {Object} Viseme data
//     */
//     wordsToVisemes(text) {
//       const result = { visemes: [], times: [], durations: [] };
//       let currentTime = 0;
  
//       for(const char of [...text]) {
//         const viseme = this.visemes[char] || 'sil';
//         const duration = this.durations[char] || this.pauses[char] || 0.1;
  
//         if(viseme === 'sil') {
//           currentTime += duration;
//           continue;
//         }
  
//         const lastIdx = result.visemes.length - 1;
//         if(lastIdx >= 0 && result.visemes[lastIdx] === viseme) {
//           // Merge identical visemes
//           result.durations[lastIdx] += duration * 0.8;
//           currentTime += duration;
//         } else {
//           result.visemes.push(viseme);
//           result.times.push(currentTime);
//           result.durations.push(duration);
//           currentTime += duration;
//         }
//       }
  
//       return result;
//     }
  
//     /**
//     * Convert numbers to Arabic words (simplified)
//     * @private
//     */
//     _numberToArabicWords(match) {
//       const numbers = [
//         'صفر', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 
//         'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'
//       ];
//       return [...match].map(d => numbers[parseInt(d)]).join(' ');
//     }
//   }
  
//   export { LipsyncAr };

// lipsync-ar.mjs
// Arabic lip-sync module for TalkingHead 3D avatar system

/**
 * @class Arabic lip-sync processor
 * @author Based on TalkingHead by Mika Suominen
 */
export class LipsyncAr {
  
  /**
   * @constructor
   */
  constructor() {
    // Arabic patterns to Oculus visemes mapping
    // Organized by letter pattern with context rules
    this.rules = {
      'ا': [
        "[ا]=O", "[آ]=O", " [ال]=aa nn"
      ],
      'ب': [
        "[ب]=PP"
      ],
      'ت': [
        "[ت]=DD", "[ة]=DD"
      ],
      'ث': [
        "[ث]=TH"
      ],
      'ج': [
        "[ج]=CH"
      ],
      'ح': [
        "[ح]=aa"
      ],
      'خ': [
        "[خ]=kk"
      ],
      'د': [
        "[د]=DD"
      ],
      'ذ': [
        "[ذ]=TH"
      ],
      'ر': [
        "[ر]=RR"
      ],
      'ز': [
        "[ز]=SS"
      ],
      'س': [
        "[س]=SS"
      ],
      'ش': [
        "[ش]=CH"
      ],
      'ص': [
        "[ص]=SS"
      ],
      'ض': [
        "[ض]=DD"
      ],
      'ط': [
        "[ط]=DD"
      ],
      'ظ': [
        "[ظ]=TH"
      ],
      'ع': [
        "[ع]=aa"
      ],
      'غ': [
        "[غ]=U"
      ],
      'ف': [
        "[ف]=FF"
      ],
      'ق': [
        "[ق]=kk"
      ],
      'ك': [
        "[ك]=kk"
      ],
      'ل': [
        "[ل]=I"
      ],
      'م': [
        "[م]=PP"
      ],
      'ن': [
        "[ن]=nn"
      ],
      'ه': [
        "[ه]=aa"
      ],
      'و': [
        "[و]=U"
      ],
      'ي': [
        "[ي]=E", "[ى]=E", "[ئ]=E"
      ],
      'ء': [
        "[ء]=aa"
      ]
    };

    // Convert rules to regex format (similar to the English version)
    Object.keys(this.rules).forEach(key => {
      this.rules[key] = this.rules[key].map(rule => {
        const posL = rule.indexOf('[');
        const posR = rule.indexOf(']');
        const posE = rule.indexOf('=');
        const strLeft = rule.substring(0, posL);
        const strLetters = rule.substring(posL+1, posR);
        const strRight = rule.substring(posR+1, posE);
        const strVisemes = rule.substring(posE+1);

        const o = { regex: '', move: 0, visemes: [] };

        let exp = '';
        exp += strLeft; // In Arabic, we'll use simpler context rules initially
        const ctxLetters = [...strLetters];
        exp += ctxLetters.join('');
        o.move = ctxLetters.length;
        exp += strRight;
        o.regex = new RegExp(exp);

        if (strVisemes.length) {
          strVisemes.split(' ').forEach(viseme => {
            o.visemes.push(viseme);
          });
        }

        return o;
      });
    });

    // Viseme durations in relative unit (1=average)
    // Adjusted for Arabic phonetics
    this.visemeDurations = {
      'aa': 1.0,  // Longer open vowel sounds
      'E': 0.9,   // Medium vowel
      'I': 0.85,  // Short vowel
      'O': 1.0,   // Long vowel
      'U': 0.9,   // Medium vowel
      'PP': 0.8,  // Bilabial consonants (shorter in Arabic)
      'SS': 1.2,  // Sibilants (longer in Arabic)
      'TH': 1.0,  // Dental fricatives
      'DD': 0.9,  // Dental/alveolar stops
      'FF': 0.9,  // Labiodental fricatives
      'kk': 0.8,  // Velar/uvular stops (shorter in Arabic)
      'nn': 0.8,  // Nasals
      'RR': 0.7,  // Trill (shorter in Arabic)
      'CH': 1.1,  // Postalveolar fricatives
      'sil': 1.0  // Silence
    };

    // Pauses in relative units (1=average)
    this.specialDurations = { ' ': 1, '،': 3, '-':0.5, "'":0.5 };

    // Arabic number words
    this.digits = ['صفر', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
    this.ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
    this.tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
    this.teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
    
    // Symbols to Arabic
    this.symbols = {
      '%': 'بالمائة',
      '€': 'يورو',
      '&': 'و',
      '+': 'زائد',
      '$': 'دولار'
    };
    this.symbolsReg = /[%€&\+\$]/g;
  }

  /**
   * Convert a digit by digit (for phone numbers, etc.)
   * @param {string} num Number string
   * @return {string} Arabic words
   */
  convert_digit_by_digit(num) {
    num = String(num).split("");
    let numWords = "";
    for(let m=0; m < num.length; m++) {
      numWords += this.digits[parseInt(num[m])] + " ";
    }
    numWords = numWords.substring(0, numWords.length - 1); // Remove final space
    return numWords;
  }

  /**
   * Convert tens (10-99)
   * @param {number} num Number to convert
   * @return {string} Arabic words
   */
  convert_tens(num) {
    num = parseInt(num);
    if (num < 10) {
      return this.ones[num];
    } else if (num >= 10 && num < 20) {
      return this.teens[num - 10];
    } else {
      const ten = Math.floor(num / 10);
      const one = num % 10;
      if (one === 0) {
        return this.tens[ten];
      } else {
        return this.ones[one] + " و " + this.tens[ten];
      }
    }
  }

  /**
   * Convert hundreds (100-999)
   * @param {number} num Number to convert
   * @return {string} Arabic words
   */
  convert_hundreds(num) {
    num = parseInt(num);
    if (num > 99) {
      const hundred = Math.floor(num / 100);
      const remainder = num % 100;
      
      let result = "";
      if (hundred === 1) {
        result = "مائة";
      } else if (hundred === 2) {
        result = "مائتان";
      } else {
        result = this.ones[hundred] + " مائة";
      }
      
      if (remainder > 0) {
        result += " و " + this.convert_tens(remainder);
      }
      return result;
    } else {
      return this.convert_tens(num);
    }
  }

  /**
   * Convert thousands (1000-999999)
   * @param {number} num Number to convert
   * @return {string} Arabic words
   */
  convert_thousands(num) {
    num = parseInt(num);
    if (num >= 1000) {
      const thousand = Math.floor(num / 1000);
      const remainder = num % 1000;
      
      let result = "";
      if (thousand === 1) {
        result = "ألف";
      } else if (thousand === 2) {
        result = "ألفان";
      } else if (thousand >= 3 && thousand <= 10) {
        result = this.ones[thousand] + " آلاف";
      } else {
        result = this.convert_hundreds(thousand) + " ألف";
      }
      
      if (remainder > 0) {
        result += " و " + this.convert_hundreds(remainder);
      }
      return result;
    } else {
      return this.convert_hundreds(num);
    }
  }

  /**
   * Convert millions (1000000+)
   * @param {number} num Number to convert
   * @return {string} Arabic words
   */
  convert_millions(num) {
    num = parseInt(num);
    if (num >= 1000000) {
      const million = Math.floor(num / 1000000);
      const remainder = num % 1000000;
      
      let result = "";
      if (million === 1) {
        result = "مليون";
      } else if (million === 2) {
        result = "مليونان";
      } else if (million >= 3 && million <= 10) {
        result = this.ones[million] + " ملايين";
      } else {
        result = this.convert_hundreds(million) + " مليون";
      }
      
      if (remainder > 0) {
        result += " و " + this.convert_thousands(remainder);
      }
      return result;
    } else {
      return this.convert_thousands(num);
    }
  }

  /**
   * Convert number to Arabic words
   * @param {string} num Number string
   * @return {string} Arabic words
   */
  convertNumberToWords(num) {
    if (num === "0") {
      return "صفر";
    } else if (num.startsWith('0')) {
      return this.convert_digit_by_digit(num);
    } else if ((parseInt(num) < 1000 && parseInt(num) > 99) || 
              (parseInt(num) > 10000 && parseInt(num) < 1000000)) {
      // Read area and phone codes digit by digit
      return this.convert_digit_by_digit(num);
    } else {
      return this.convert_millions(num);
    }
  }

  /**
   * Preprocess text:
   * - convert symbols to words
   * - convert numbers to words
   * - filter out characters that should be left unspoken
   * @param {string} s Text
   * @return {string} Pre-processed text.
   */
  preProcessText(s) {
    if (!s) return '';
    
    return s.replace(/[ـ]/g, '') // Remove tatweel
      .replace(/[#_*\":;]/g, '')
      .replace(this.symbolsReg, (symbol) => {
        return ' ' + this.symbols[symbol] + ' ';
      })
      .replace(/(\d)\.(\d)/g, '$1 فاصلة $2') // Decimal point
      .replace(/\d+/g, (match) => this.convertNumberToWords(match)) // Numbers to words
      .replace(/(\D)\1\1+/g, "$1$1") // Max 2 repeating chars
      .replace(/\s+/g, ' ') // Normalize spacing
      .trim();
  }

  /**
   * Convert word to Oculus LipSync Visemes and durations
   * @param {string} w Text
   * @return {Object} Oculus LipSync Visemes and durations.
   */
  wordsToVisemes(w) {
    let o = { words: w, visemes: [], times: [], durations: [], i: 0 };
    let t = 0;

    const chars = [...o.words];
    while (o.i < chars.length) {
      const c = chars[o.i];
      const ruleset = this.rules[c];
      
      if (ruleset) {
        let matched = false;
        for (let i = 0; i < ruleset.length; i++) {
          const rule = ruleset[i];
          const test = o.words;
          let matches = test.substring(o.i).match(rule.regex);
          
          if (matches && matches.index === 0) {
            matched = true;
            rule.visemes.forEach(viseme => {
              if (o.visemes.length && o.visemes[o.visemes.length - 1] === viseme) {
                // Same viseme as before, extend duration instead of adding new
                const d = 0.7 * (this.visemeDurations[viseme] || 1);
                o.durations[o.durations.length - 1] += d;
                t += d;
              } else {
                const d = this.visemeDurations[viseme] || 1;
                o.visemes.push(viseme);
                o.times.push(t);
                o.durations.push(d);
                t += d;
              }
            });
            o.i += rule.move;
            break;
          }
        }
        
        if (!matched) {
          // No rule matched, move to next character
          o.i++;
        }
      } else {
        // Special character handling (spaces, etc.)
        if (c === ' ') {
          o.visemes.push('sil');
          o.times.push(t);
          const d = this.specialDurations[c] || 0.5;
          o.durations.push(d);
          t += d;
        }
        o.i++;
      }
    }

    // End with silence
    if (o.visemes.length && o.visemes[o.visemes.length - 1] !== 'sil') {
      o.visemes.push('sil');
      o.times.push(t);
      o.durations.push(0.5);
    }

    // Scale times to milliseconds
    for (let i = 0; i < o.times.length; i++) {
      o.times[i] = Math.round(o.times[i] * 80); // 80ms as base timing unit
      o.durations[i] = Math.round(o.durations[i] * 80);
    }

    return { visemes: o.visemes, times: o.times, durations: o.durations };
  }

  /**
   * Process Arabic text to visemes (main entry point)
   * @param {string} text Arabic text
   * @return {Object} Object with visemes, times, and durations
   */
  process(text) {
    const processedText = this.preProcessText(text);
    return this.wordsToVisemes(processedText);
  }
  
  /**
   * Get supported viseme names
   * @return {string[]} Array of supported viseme names
   */
  getVisemeNames() {
    return [
      'sil', 'PP', 'FF', 'TH', 'DD', 'kk', 'CH', 
      'SS', 'nn', 'RR', 'aa', 'E', 'I', 'O', 'U'
    ];
  }
}