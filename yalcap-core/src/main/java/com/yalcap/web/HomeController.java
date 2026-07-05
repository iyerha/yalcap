package com.yalcap.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class HomeController {

    @GetMapping("/")
    public String index() {
        return "redirect:/t/00000000-0000-0000-0000-000000000000/designer";
    }
}
