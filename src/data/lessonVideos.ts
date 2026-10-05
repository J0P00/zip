export interface LessonVideoAsset {
  publicId: string;
  secureUrl: string;
}

// Verified Cloudinary delivery URLs. Keep provider credentials out of this file.
export const lessonVideos = {
  oop: {
    oop_lesson_1: { publicId: 'Lesson_1Classes_Objects', secureUrl: 'https://res.cloudinary.com/jaudkms2/video/upload/v1791200171/Lesson_1Classes_Objects.mp4' },
    oop_lesson_2: { publicId: 'Lesson_2_Constructor', secureUrl: 'https://res.cloudinary.com/jaudkms2/video/upload/v1791200164/Lesson_2_Constructor.mp4' },
    oop_lesson_3: { publicId: 'Lesson_3Object_Method', secureUrl: 'https://res.cloudinary.com/jaudkms2/video/upload/v1791200165/Lesson_3Object_Method.mp4' },
    oop_lesson_4: { publicId: 'Lesson_4_Encapsulation', secureUrl: 'https://res.cloudinary.com/jaudkms2/video/upload/v1791200173/Lesson_4_Encapsulation.mp4' },
    oop_lesson_5: { publicId: 'Lesson_5_Constructor_Overloading', secureUrl: 'https://res.cloudinary.com/jaudkms2/video/upload/v1791200164/Lesson_5_Constructor_Overloading.mp4' },
    oop_lesson_6: { publicId: 'Lesson_6_Inheritance', secureUrl: 'https://res.cloudinary.com/jaudkms2/video/upload/v1791200163/Lesson_6_Inheritance.mp4' },
    oop_lesson_7: { publicId: 'Lesson_7_Polymorphism', secureUrl: 'https://res.cloudinary.com/jaudkms2/video/upload/v1791200159/Lesson_7_Polymorphism.mp4' },
    oop_lesson_8: { publicId: 'Lesson_8_Abstract_Classes', secureUrl: 'https://res.cloudinary.com/jaudkms2/video/upload/v1791200159/Lesson_8_Abstract_Classes.mp4' },
    oop_lesson_9: { publicId: 'Lesson_9_Interfaces_Abstract', secureUrl: 'https://res.cloudinary.com/jaudkms2/video/upload/v1791200162/Lesson_9_Interfaces_Abstract.mp4' },
    oop_lesson_10: { publicId: 'Lesson_10_Interfaces', secureUrl: 'https://res.cloudinary.com/jaudkms2/video/upload/v1791200166/Lesson_10_Interfaces.mp4' },
    oop_lesson_11: { publicId: 'Lesson_11_Array_Of_Object', secureUrl: 'https://res.cloudinary.com/jaudkms2/video/upload/v1791200177/Lesson_11_Array_Of_Object.mp4' },
    oop_lesson_12: { publicId: 'Lesson_12_Enum', secureUrl: 'https://res.cloudinary.com/jaudkms2/video/upload/v1791200177/Lesson_12_Enum.mp4' }
  },
  javaSwing: {
    swing_lesson_1: { publicId: 'Topic_1_JFRAME', secureUrl: 'https://res.cloudinary.com/jaudkms2/video/upload/v1791200208/Topic_1_JFRAME.mp4' },
    swing_lesson_2: { publicId: 'Topic_2_Jlabel_JTextField_JtextArea', secureUrl: 'https://res.cloudinary.com/jaudkms2/video/upload/v1791200212/Topic_2_Jlabel_JTextField_JtextArea.mp4' },
    swing_lesson_3: { publicId: 'Topic_3_JButton_ActionListener', secureUrl: 'https://res.cloudinary.com/jaudkms2/video/upload/v1791200207/Topic_3_JButton_ActionListener.mp4' },
    swing_lesson_4: { publicId: 'Topic_4_JPanel_LayoutManagers', secureUrl: 'https://res.cloudinary.com/jaudkms2/video/upload/v1791200209/Topic_4_JPanel_LayoutManagers.mp4' },
    swing_lesson_5: { publicId: 'Topic_5_JOptionPane', secureUrl: 'https://res.cloudinary.com/jaudkms2/video/upload/v1791200214/Topic_5_JOptionPane.mp4' }
  }
} as const;
