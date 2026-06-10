package com.quilombo;

import org.springframework.boot.SpringApplication;

public class TestQuilomboApplication {

	public static void main(String[] args) {
		SpringApplication.from(QuilomboApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
